-- Migration: Add regrade_exam function
-- Optimize performance by moving regrading logic to DB

CREATE OR REPLACE FUNCTION regrade_exam(p_exam_id uuid)
RETURNS integer
LANGUAGE plpgsql
-- SECURITY INVOKER is default, respecting RLS policies
AS $$
DECLARE
    v_exam record;
    v_sub record;
    v_sub_json jsonb;
    v_total_questions integer;
    v_updated_count integer := 0;

    v_correct_count numeric;
    v_score numeric;

    -- MC logic
    v_mc_lookup jsonb := '{}'::jsonb;
    v_mc_count integer := 0;
    v_mc_correct_ans text;
    v_student_mc_ans text;
    v_student_answers_json jsonb;
    v_i integer;

    -- TF logic
    v_tf_answers jsonb;
    v_student_tf_answers jsonb;
    v_tf_q jsonb;
    v_student_tf_q jsonb;

    -- SA logic
    v_sa_answers jsonb;
    v_student_sa_answers jsonb;
    v_sa_q jsonb;
    v_student_sa_q jsonb;
BEGIN
    -- Get exam data
    SELECT * INTO v_exam FROM exams WHERE id = p_exam_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- 1. Build MC lookup map & Count
    IF v_exam.mc_answers IS NOT NULL AND jsonb_array_length(v_exam.mc_answers) > 0 THEN
        FOR v_tf_q IN SELECT * FROM jsonb_array_elements(v_exam.mc_answers) LOOP
            v_mc_lookup := jsonb_set(v_mc_lookup, ARRAY[v_tf_q->>'question'], v_tf_q->'answer');
        END LOOP;
    ELSIF v_exam.correct_answers IS NOT NULL THEN
        FOR v_i IN 1..array_length(v_exam.correct_answers, 1) LOOP
             v_mc_lookup := jsonb_set(v_mc_lookup, ARRAY[v_i::text], to_jsonb(v_exam.correct_answers[v_i]));
        END LOOP;
    END IF;

    -- Calculate counts dynamically
    SELECT count(*) INTO v_mc_count FROM jsonb_each(v_mc_lookup);

    v_tf_answers := COALESCE(v_exam.tf_answers, '[]'::jsonb);
    v_sa_answers := COALESCE(v_exam.sa_answers, '[]'::jsonb);

    v_total_questions := v_mc_count + jsonb_array_length(v_tf_answers) + jsonb_array_length(v_sa_answers);

    -- Iterate over submissions
    FOR v_sub IN SELECT * FROM submissions WHERE exam_id = p_exam_id LOOP
        v_sub_json := to_jsonb(v_sub);
        v_correct_count := 0;

        -- 1. Grade MC
        -- Try 'answers' then 'student_answers'
        v_student_answers_json := v_sub_json -> 'answers';
        IF v_student_answers_json IS NULL OR jsonb_typeof(v_student_answers_json) = 'null' THEN
            v_student_answers_json := v_sub_json -> 'student_answers';
        END IF;

        IF v_student_answers_json IS NOT NULL AND jsonb_typeof(v_student_answers_json) = 'array' THEN
             FOR v_i IN 0..jsonb_array_length(v_student_answers_json) - 1 LOOP
                -- Question index is v_i + 1. Convert to text for jsonb object lookup
                v_mc_correct_ans := v_mc_lookup->>((v_i + 1)::text);
                v_student_mc_ans := v_student_answers_json->>v_i;

                IF v_mc_correct_ans IS NOT NULL AND v_student_mc_ans IS NOT NULL AND
                   upper(v_student_mc_ans) = upper(v_mc_correct_ans) THEN
                    v_correct_count := v_correct_count + 1;
                END IF;
             END LOOP;
        END IF;

        -- 2. Grade TF
        -- Try 'tf_answers' then 'tf_student_answers'
        v_student_tf_answers := v_sub_json -> 'tf_answers';
        IF v_student_tf_answers IS NULL OR jsonb_typeof(v_student_tf_answers) = 'null' THEN
            v_student_tf_answers := v_sub_json -> 'tf_student_answers';
        END IF;

        IF jsonb_array_length(v_tf_answers) > 0 AND v_student_tf_answers IS NOT NULL AND jsonb_typeof(v_student_tf_answers) = 'array' THEN
            FOR v_tf_q IN SELECT * FROM jsonb_array_elements(v_tf_answers) LOOP
                FOR v_student_tf_q IN SELECT * FROM jsonb_array_elements(v_student_tf_answers) LOOP
                    IF (v_student_tf_q->>'question')::int = (v_tf_q->>'question')::int THEN
                        IF (v_student_tf_q->>'a')::boolean IS NOT DISTINCT FROM (v_tf_q->>'a')::boolean THEN v_correct_count := v_correct_count + 0.25; END IF;
                        IF (v_student_tf_q->>'b')::boolean IS NOT DISTINCT FROM (v_tf_q->>'b')::boolean THEN v_correct_count := v_correct_count + 0.25; END IF;
                        IF (v_student_tf_q->>'c')::boolean IS NOT DISTINCT FROM (v_tf_q->>'c')::boolean THEN v_correct_count := v_correct_count + 0.25; END IF;
                        IF (v_student_tf_q->>'d')::boolean IS NOT DISTINCT FROM (v_tf_q->>'d')::boolean THEN v_correct_count := v_correct_count + 0.25; END IF;
                    END IF;
                END LOOP;
            END LOOP;
        END IF;

        -- 3. Grade SA
        -- Try 'sa_answers' then 'sa_student_answers'
        v_student_sa_answers := v_sub_json -> 'sa_answers';
        IF v_student_sa_answers IS NULL OR jsonb_typeof(v_student_sa_answers) = 'null' THEN
            v_student_sa_answers := v_sub_json -> 'sa_student_answers';
        END IF;

        IF jsonb_array_length(v_sa_answers) > 0 AND v_student_sa_answers IS NOT NULL AND jsonb_typeof(v_student_sa_answers) = 'array' THEN
            FOR v_sa_q IN SELECT * FROM jsonb_array_elements(v_sa_answers) LOOP
                FOR v_student_sa_q IN SELECT * FROM jsonb_array_elements(v_student_sa_answers) LOOP
                    IF (v_student_sa_q->>'question')::int = (v_sa_q->>'question')::int THEN
                         IF trim(lower(v_sa_q->>'answer')) = trim(lower(v_student_sa_q->>'answer')) THEN
                            v_correct_count := v_correct_count + 1;
                         END IF;
                    END IF;
                END LOOP;
            END LOOP;
        END IF;

        -- Calculate Score
        IF v_total_questions > 0 THEN
            v_score := (v_correct_count / v_total_questions) * 10;
        ELSE
            v_score := 0;
        END IF;

        -- Update Submission
        UPDATE submissions
        SET score = v_score,
            correct_count = round(v_correct_count, 2)
        WHERE id = v_sub.id;

        v_updated_count := v_updated_count + 1;

    END LOOP;

    RETURN v_updated_count;
END;
$$;
