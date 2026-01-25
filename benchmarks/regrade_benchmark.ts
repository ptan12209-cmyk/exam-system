
// Mock data
const SUBMISSION_COUNT = 100;
const LATENCY_MS = 50; // Simulate 50ms network latency per request

const submissions = Array.from({ length: SUBMISSION_COUNT }, (_, i) => ({
    id: `sub_${i}`,
    answers: ["A", "B", "C", "D"],
    tf_answers: [],
    sa_answers: []
}));

const mcAnswers = ["A", "B", "C", "D"];

// Mock Supabase Client
const mockSupabase = {
    from: (table: string) => ({
        update: async (data: any) => {
            await new Promise(resolve => setTimeout(resolve, LATENCY_MS));
            return { eq: async (col: string, val: string) => ({ error: null }) };
        }
    }),
    rpc: async (func: string, params: any) => {
        await new Promise(resolve => setTimeout(resolve, LATENCY_MS)); // 1 RPC call latency
        return { data: SUBMISSION_COUNT, error: null };
    }
};

async function benchmarkClientSide() {
    console.log(`Starting Client-Side Benchmark with ${SUBMISSION_COUNT} submissions...`);
    const start = Date.now();

    let updatedCount = 0;
    for (const sub of submissions) {
        // Calculation logic (fast)
        let correctCount = 0;
        // ... grading logic ...

        // Update submission (slow network call)
        // Simulate chained call: from().update().eq()
        const query = mockSupabase.from("submissions").update({ score: 10, correct_count: 4 });
        await (await query).eq("id", sub.id);

        updatedCount++;
    }

    const end = Date.now();
    console.log(`Client-Side Regrade took: ${(end - start).toFixed(2)}ms`);
    return end - start;
}

async function benchmarkRPC() {
    console.log(`Starting RPC Benchmark with ${SUBMISSION_COUNT} submissions...`);
    const start = Date.now();

    // Single RPC call
    await mockSupabase.rpc("regrade_exam", { exam_id: "exam_123" });

    const end = Date.now();
    console.log(`RPC Regrade took: ${(end - start).toFixed(2)}ms`);
    return end - start;
}

async function run() {
    const clientTime = await benchmarkClientSide();
    const rpcTime = await benchmarkRPC();

    console.log(`\nImprovement: ${(clientTime / rpcTime).toFixed(1)}x faster`);
}

run();
