"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { X, Delete, ChevronDown, ChevronUp, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScientificCalculatorProps {
    isOpen: boolean
    onClose: () => void
}

type CalcMode = "COMP" | "STAT" | "EQN" | "TABLE"
type AngleMode = "DEG" | "RAD" | "GRAD"
type DisplayFormat = "Norm" | "Fix" | "Sci"

// Calculator button component
function CalcButton({
    children,
    onClick,
    className,
    variant = "default",
    size = "normal",
    disabled = false
}: {
    children: React.ReactNode
    onClick: () => void
    className?: string
    variant?: "default" | "operator" | "function" | "number" | "action" | "special" | "shift" | "alpha"
    size?: "normal" | "small" | "wide"
    disabled?: boolean
}) {
    const variants = {
        default: "bg-slate-700 hover:bg-slate-600 text-white",
        operator: "bg-blue-600 hover:bg-blue-500 text-white",
        function: "bg-slate-600 hover:bg-slate-500 text-cyan-300",
        number: "bg-slate-800 hover:bg-slate-700 text-white",
        action: "bg-orange-600 hover:bg-orange-500 text-white",
        special: "bg-purple-600 hover:bg-purple-500 text-white",
        shift: "bg-yellow-600 hover:bg-yellow-500 text-black font-bold",
        alpha: "bg-red-600 hover:bg-red-500 text-white font-bold"
    }

    const sizes = {
        normal: "h-9 text-xs",
        small: "h-7 text-[10px]",
        wide: "h-9 text-xs col-span-2"
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex items-center justify-center rounded-md font-medium transition-all active:scale-95",
                sizes[size],
                variants[variant],
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {children}
        </button>
    )
}

// Main Calculator Component
export function ScientificCalculator({ isOpen, onClose }: ScientificCalculatorProps) {
    // Display states
    const [display, setDisplay] = useState("0")
    const [expression, setExpression] = useState("")
    const [cursorPos, setCursorPos] = useState(0)

    // Mode states
    const [mode, setMode] = useState<CalcMode>("COMP")
    const [angleMode, setAngleMode] = useState<AngleMode>("DEG")
    const [displayFormat, setDisplayFormat] = useState<DisplayFormat>("Norm")
    const [shiftActive, setShiftActive] = useState(false)
    const [alphaActive, setAlphaActive] = useState(false)

    // Memory states
    const [memory, setMemory] = useState({
        M: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0
    })
    const [ans, setAns] = useState(0)
    const [preAns, setPreAns] = useState(0)

    // History for undo
    const [history, setHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    // Statistics mode data
    const [statData, setStatData] = useState<number[]>([])
    const [statDataY, setStatDataY] = useState<number[]>([])

    // Equation mode
    const [eqnType, setEqnType] = useState<"quad" | "cubic" | "sys2" | "sys3">("quad")
    const [eqnCoeffs, setEqnCoeffs] = useState<number[]>([])

    // UI states
    const [showModeMenu, setShowModeMenu] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showStatEditor, setShowStatEditor] = useState(false)

    // Handle keyboard input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            if (e.key === "Escape") {
                onClose()
                return
            }

            if (e.key >= "0" && e.key <= "9") {
                e.preventDefault()
                handleNumber(e.key)
            } else if (e.key === ".") {
                e.preventDefault()
                handleNumber(".")
            } else if (e.key === "+" || e.key === "-") {
                e.preventDefault()
                handleOperator(e.key)
            } else if (e.key === "*") {
                e.preventDefault()
                handleOperator("×")
            } else if (e.key === "/") {
                e.preventDefault()
                handleOperator("÷")
            } else if (e.key === "Enter" || e.key === "=") {
                e.preventDefault()
                calculate()
            } else if (e.key === "Backspace") {
                e.preventDefault()
                handleDelete()
            } else if (e.key === "c" || e.key === "C") {
                if (!e.ctrlKey) {
                    e.preventDefault()
                    handleClear()
                }
            } else if (e.key === "^") {
                e.preventDefault()
                handleOperator("^")
            } else if (e.key === "(") {
                e.preventDefault()
                handleInput("(")
            } else if (e.key === ")") {
                e.preventDefault()
                handleInput(")")
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, display, expression])

    // Input helper
    const handleInput = useCallback((char: string) => {
        if (display === "0" && char !== ".") {
            setDisplay(char)
        } else {
            setDisplay(prev => prev + char)
        }
    }, [display])

    const handleNumber = useCallback((num: string) => {
        if (display === "0" && num !== ".") {
            setDisplay(num)
        } else if (num === "." && display.includes(".")) {
            return
        } else {
            setDisplay(prev => prev + num)
        }
        setShiftActive(false)
        setAlphaActive(false)
    }, [display])

    const handleOperator = useCallback((op: string) => {
        setExpression(prev => prev + display + " " + op + " ")
        setDisplay("0")
        setShiftActive(false)
        setAlphaActive(false)
    }, [display])

    // Angle conversion helpers
    const toRadians = useCallback((value: number): number => {
        switch (angleMode) {
            case "DEG": return value * Math.PI / 180
            case "RAD": return value
            case "GRAD": return value * Math.PI / 200
        }
    }, [angleMode])

    const fromRadians = useCallback((value: number): number => {
        switch (angleMode) {
            case "DEG": return value * 180 / Math.PI
            case "RAD": return value
            case "GRAD": return value * 200 / Math.PI
        }
    }, [angleMode])

    // Mathematical Functions
    const handleFunction = useCallback((func: string) => {
        const num = parseFloat(display)
        let result: number

        switch (func) {
            // Trigonometric
            case "sin": result = Math.sin(toRadians(num)); break
            case "cos": result = Math.cos(toRadians(num)); break
            case "tan": result = Math.tan(toRadians(num)); break
            case "sin⁻¹": result = fromRadians(Math.asin(num)); break
            case "cos⁻¹": result = fromRadians(Math.acos(num)); break
            case "tan⁻¹": result = fromRadians(Math.atan(num)); break

            // Hyperbolic
            case "sinh": result = Math.sinh(num); break
            case "cosh": result = Math.cosh(num); break
            case "tanh": result = Math.tanh(num); break
            case "sinh⁻¹": result = Math.asinh(num); break
            case "cosh⁻¹": result = Math.acosh(num); break
            case "tanh⁻¹": result = Math.atanh(num); break

            // Logarithmic
            case "log": result = Math.log10(num); break
            case "ln": result = Math.log(num); break
            case "log₂": result = Math.log2(num); break
            case "10ˣ": result = Math.pow(10, num); break
            case "eˣ": result = Math.exp(num); break
            case "2ˣ": result = Math.pow(2, num); break

            // Power and root
            case "√": result = Math.sqrt(num); break
            case "∛": result = Math.cbrt(num); break
            case "x²": result = num * num; break
            case "x³": result = num * num * num; break
            case "1/x": result = 1 / num; break
            case "x!": result = factorial(Math.floor(num)); break
            case "|x|": result = Math.abs(num); break

            // Other
            case "±": result = -num; break
            case "%": result = num / 100; break
            case "π": result = Math.PI; break
            case "e": result = Math.E; break

            // Rounding
            case "⌊x⌋": result = Math.floor(num); break
            case "⌈x⌉": result = Math.ceil(num); break
            case "round": result = Math.round(num); break
            case "int": result = Math.trunc(num); break
            case "frac": result = num - Math.trunc(num); break

            // Random
            case "Ran#": result = Math.random(); break
            case "RanInt": result = Math.floor(Math.random() * (num + 1)); break

            default: return
        }

        setDisplay(formatNumber(result))
        setAns(result)
        setShiftActive(false)
        setAlphaActive(false)
    }, [display, toRadians, fromRadians])

    // Two-input functions
    const handleTwoInputFunction = useCallback((func: string, b: number) => {
        const a = parseFloat(display)
        let result: number

        switch (func) {
            case "GCD": result = gcd(Math.abs(Math.floor(a)), Math.abs(Math.floor(b))); break
            case "LCM": result = lcm(Math.abs(Math.floor(a)), Math.abs(Math.floor(b))); break
            case "nPr": result = permutation(Math.floor(a), Math.floor(b)); break
            case "nCr": result = combination(Math.floor(a), Math.floor(b)); break
            case "xʸ": result = Math.pow(a, b); break
            case "ʸ√x": result = Math.pow(a, 1 / b); break
            case "logₐ": result = Math.log(b) / Math.log(a); break
            default: return
        }

        setDisplay(formatNumber(result))
        setAns(result)
    }, [display])

    // Helper math functions
    const factorial = (n: number): number => {
        if (n < 0) return NaN
        if (n === 0 || n === 1) return 1
        if (n > 170) return Infinity
        let result = 1
        for (let i = 2; i <= n; i++) result *= i
        return result
    }

    const gcd = (a: number, b: number): number => {
        while (b) { const t = b; b = a % b; a = t }
        return a
    }

    const lcm = (a: number, b: number): number => (a * b) / gcd(a, b)

    const permutation = (n: number, r: number): number => {
        if (r > n || r < 0 || n < 0) return 0
        return factorial(n) / factorial(n - r)
    }

    const combination = (n: number, r: number): number => {
        if (r > n || r < 0 || n < 0) return 0
        return factorial(n) / (factorial(r) * factorial(n - r))
    }

    // Prime factorization
    const primeFactorize = (n: number): string => {
        n = Math.abs(Math.floor(n))
        if (n <= 1) return n.toString()
        const factors: string[] = []
        let d = 2
        while (n > 1) {
            let count = 0
            while (n % d === 0) {
                n /= d
                count++
            }
            if (count > 0) {
                factors.push(count > 1 ? `${d}^${count}` : d.toString())
            }
            d++
        }
        return factors.join(" × ")
    }

    // Statistics functions
    const calcStats = useCallback(() => {
        if (statData.length === 0) return null
        const n = statData.length
        const sum = statData.reduce((a, b) => a + b, 0)
        const mean = sum / n
        const sumSq = statData.reduce((a, b) => a + b * b, 0)
        const variance = sumSq / n - mean * mean
        const stdDev = Math.sqrt(variance)
        const sampleStdDev = Math.sqrt(statData.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1))

        return {
            n,
            sum,
            mean,
            sumSq,
            variance,
            stdDev,        // σn (population)
            sampleStdDev,  // σn-1 (sample)
            min: Math.min(...statData),
            max: Math.max(...statData)
        }
    }, [statData])

    // Linear regression
    const calcRegression = useCallback(() => {
        if (statData.length < 2 || statDataY.length < 2) return null
        const n = Math.min(statData.length, statDataY.length)
        const sumX = statData.slice(0, n).reduce((a, b) => a + b, 0)
        const sumY = statDataY.slice(0, n).reduce((a, b) => a + b, 0)
        const sumXY = statData.slice(0, n).reduce((acc, x, i) => acc + x * statDataY[i], 0)
        const sumX2 = statData.slice(0, n).reduce((a, b) => a + b * b, 0)

        const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
        const a = (sumY - b * sumX) / n

        // Correlation coefficient
        const sumY2 = statDataY.slice(0, n).reduce((a, b) => a + b * b, 0)
        const r = (n * sumXY - sumX * sumY) /
            Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2))

        return { a, b, r, r2: r * r }
    }, [statData, statDataY])

    // Equation solving
    const solveQuadratic = (a: number, b: number, c: number): { x1: number | string, x2: number | string } => {
        const discriminant = b * b - 4 * a * c
        if (discriminant > 0) {
            return {
                x1: (-b + Math.sqrt(discriminant)) / (2 * a),
                x2: (-b - Math.sqrt(discriminant)) / (2 * a)
            }
        } else if (discriminant === 0) {
            return { x1: -b / (2 * a), x2: -b / (2 * a) }
        } else {
            const real = -b / (2 * a)
            const imag = Math.sqrt(-discriminant) / (2 * a)
            return {
                x1: `${formatNumber(real)} + ${formatNumber(imag)}i`,
                x2: `${formatNumber(real)} - ${formatNumber(imag)}i`
            }
        }
    }

    // Number formatting
    const formatNumber = (num: number): string => {
        if (Number.isNaN(num)) return "Error"
        if (!Number.isFinite(num)) return num > 0 ? "∞" : "-∞"

        if (displayFormat === "Sci") {
            return num.toExponential(6)
        }

        if (displayFormat === "Fix") {
            return num.toFixed(4)
        }

        // Norm mode
        if (Math.abs(num) < 1e-10 && num !== 0) return num.toExponential(6)
        if (Math.abs(num) >= 1e10) return num.toExponential(6)

        const rounded = Math.round(num * 1e10) / 1e10
        return rounded.toString()
    }

    // Main calculate function
    const calculate = useCallback(() => {
        try {
            const fullExpression = expression + display
            const jsExpression = fullExpression
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
                .replace(/\^/g, "**")
                .replace(/\s/g, "")

            const result = new Function(`return ${jsExpression}`)()
            const formatted = formatNumber(result)

            setHistory(prev => [...prev.slice(-19), `${fullExpression} = ${formatted}`])
            setPreAns(ans)
            setAns(result)
            setExpression("")
            setDisplay(formatted)
        } catch {
            setDisplay("Syntax ERROR")
        }
        setShiftActive(false)
        setAlphaActive(false)
    }, [expression, display, ans, displayFormat])

    const handleClear = useCallback(() => {
        setDisplay("0")
        setShiftActive(false)
        setAlphaActive(false)
    }, [])

    const handleAllClear = useCallback(() => {
        setDisplay("0")
        setExpression("")
    }, [])

    const handleDelete = useCallback(() => {
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0")
    }, [])

    // Memory operations
    const memoryStore = useCallback((variable: keyof typeof memory) => {
        setMemory(prev => ({ ...prev, [variable]: parseFloat(display) }))
    }, [display])

    const memoryRecall = useCallback((variable: keyof typeof memory) => {
        setDisplay(formatNumber(memory[variable]))
    }, [memory])

    const memoryAdd = useCallback(() => {
        setMemory(prev => ({ ...prev, M: prev.M + parseFloat(display) }))
    }, [display])

    const memorySub = useCallback(() => {
        setMemory(prev => ({ ...prev, M: prev.M - parseFloat(display) }))
    }, [display])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Calculator Panel - fx-580VN X Style */}
            <div className="relative w-full sm:w-[380px] max-h-[95vh] bg-gradient-to-b from-[#1a1f2e] to-[#0d1117] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-600/50 overflow-hidden animate-scale-in">

                {/* Header Bar */}
                <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#2d3748] to-[#1a202c] border-b border-slate-600/50">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">fx-580VN X</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-blue-600 text-white rounded font-bold">{mode}</span>
                        <span className={cn(
                            "px-1.5 py-0.5 text-[9px] rounded font-medium",
                            angleMode === "DEG" ? "bg-green-600" : angleMode === "RAD" ? "bg-orange-600" : "bg-purple-600",
                            "text-white"
                        )}>
                            {angleMode}
                        </span>
                        {memory.M !== 0 && <span className="px-1 text-[9px] bg-yellow-600 text-black rounded font-bold">M</span>}
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* LCD Display */}
                <div className="mx-3 my-2 bg-gradient-to-b from-[#b8c8b8] to-[#98b898] rounded-lg p-2 border-2 border-slate-500 shadow-inner font-mono">
                    <div className="text-right text-slate-600 text-[10px] h-3 truncate">{expression || " "}</div>
                    <div className="text-right text-slate-900 text-xl font-bold truncate leading-tight">{display}</div>
                </div>

                {/* Mode Menu */}
                {showModeMenu && (
                    <div className="mx-3 mb-2 p-2 bg-slate-800 rounded-lg border border-slate-600 grid grid-cols-4 gap-1">
                        {(["COMP", "STAT", "EQN", "TABLE"] as CalcMode[]).map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setShowModeMenu(false) }}
                                className={cn(
                                    "py-1.5 text-[10px] rounded font-medium",
                                    mode === m ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                )}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                )}

                {/* Statistics Data Editor */}
                {mode === "STAT" && showStatEditor && (
                    <div className="mx-3 mb-2 p-2 bg-slate-800 rounded-lg border border-slate-600 max-h-32 overflow-y-auto">
                        <div className="text-[10px] text-slate-400 mb-1">Data: {statData.join(", ") || "Empty"}</div>
                        <div className="flex gap-1">
                            <button onClick={() => setStatData(prev => [...prev, parseFloat(display)])}
                                className="flex-1 py-1 text-[10px] bg-green-600 text-white rounded">
                                Add Data
                            </button>
                            <button onClick={() => setStatData([])}
                                className="flex-1 py-1 text-[10px] bg-red-600 text-white rounded">
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {/* Keypad */}
                <div className="p-2 space-y-1">
                    {/* Row 1: Mode keys */}
                    <div className="grid grid-cols-6 gap-1">
                        <CalcButton variant="shift" onClick={() => setShiftActive(!shiftActive)}>
                            SHIFT
                        </CalcButton>
                        <CalcButton variant="alpha" onClick={() => setAlphaActive(!alphaActive)}>
                            ALPHA
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => setShowModeMenu(!showModeMenu)}>
                            MODE
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => {
                            const modes: AngleMode[] = ["DEG", "RAD", "GRAD"]
                            setAngleMode(modes[(modes.indexOf(angleMode) + 1) % 3])
                        }}>
                            {angleMode}
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => setShowHistory(!showHistory)}>
                            ▲
                        </CalcButton>
                        <CalcButton variant="action" onClick={handleAllClear}>AC</CalcButton>
                    </div>

                    {/* Row 2: Function keys */}
                    <div className="grid grid-cols-6 gap-1">
                        <CalcButton variant="function" onClick={() => handleFunction(shiftActive ? "x!" : "x²")}>
                            {shiftActive ? "n!" : "x²"}
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction(shiftActive ? "∛" : "√")}>
                            {shiftActive ? "∛" : "√"}
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleOperator("^")}>
                            xʸ
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction(shiftActive ? "10ˣ" : "log")}>
                            {shiftActive ? "10ˣ" : "log"}
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction(shiftActive ? "eˣ" : "ln")}>
                            {shiftActive ? "eˣ" : "ln"}
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction("1/x")}>
                            x⁻¹
                        </CalcButton>
                    </div>

                    {/* Row 3: Trig */}
                    <div className="grid grid-cols-6 gap-1">
                        <CalcButton variant="function" onClick={() => handleFunction(shiftActive ? "sin⁻¹" : "sin")}>
                            {shiftActive ? "sin⁻¹" : "sin"}
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction(shiftActive ? "cos⁻¹" : "cos")}>
                            {shiftActive ? "cos⁻¹" : "cos"}
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction(shiftActive ? "tan⁻¹" : "tan")}>
                            {shiftActive ? "tan⁻¹" : "tan"}
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleInput("(")}>
                            (
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleInput(")")}>
                            )
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleInput(",")}>
                            ,
                        </CalcButton>
                    </div>

                    {/* Row 4: More functions */}
                    <div className="grid grid-cols-6 gap-1">
                        <CalcButton variant="function" onClick={() => handleFunction(shiftActive ? "sinh⁻¹" : "sinh")} size="small">
                            {shiftActive ? "sinh⁻¹" : "sinh"}
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction(shiftActive ? "cosh⁻¹" : "cosh")} size="small">
                            {shiftActive ? "cosh⁻¹" : "cosh"}
                        </CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction(shiftActive ? "tanh⁻¹" : "tanh")} size="small">
                            {shiftActive ? "tanh⁻¹" : "tanh"}
                        </CalcButton>
                        <CalcButton variant="special" onClick={memoryAdd} size="small">M+</CalcButton>
                        <CalcButton variant="special" onClick={memorySub} size="small">M-</CalcButton>
                        <CalcButton variant="special" onClick={() => memoryRecall("M")} size="small">MR</CalcButton>
                    </div>

                    {/* Row 5: Numbers 7-9 */}
                    <div className="grid grid-cols-5 gap-1">
                        <CalcButton variant="number" onClick={() => handleNumber("7")}>7</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("8")}>8</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("9")}>9</CalcButton>
                        <CalcButton variant="action" onClick={handleDelete}><Delete className="w-4 h-4" /></CalcButton>
                        <CalcButton variant="operator" onClick={() => handleOperator("÷")}>÷</CalcButton>
                    </div>

                    {/* Row 6: Numbers 4-6 */}
                    <div className="grid grid-cols-5 gap-1">
                        <CalcButton variant="number" onClick={() => handleNumber("4")}>4</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("5")}>5</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("6")}>6</CalcButton>
                        <CalcButton variant="function" onClick={() => setDisplay(formatNumber(ans))}>Ans</CalcButton>
                        <CalcButton variant="operator" onClick={() => handleOperator("×")}>×</CalcButton>
                    </div>

                    {/* Row 7: Numbers 1-3 */}
                    <div className="grid grid-cols-5 gap-1">
                        <CalcButton variant="number" onClick={() => handleNumber("1")}>1</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("2")}>2</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("3")}>3</CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction("π")}>π</CalcButton>
                        <CalcButton variant="operator" onClick={() => handleOperator("-")}>−</CalcButton>
                    </div>

                    {/* Row 8: 0, ., =  */}
                    <div className="grid grid-cols-5 gap-1">
                        <CalcButton variant="number" onClick={() => handleNumber("0")}>0</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber(".")}>.</CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction("±")}>(-)</CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction("e")}>e</CalcButton>
                        <CalcButton variant="operator" onClick={() => handleOperator("+")}>+</CalcButton>
                    </div>

                    {/* Row 9: Equals */}
                    <div className="grid grid-cols-5 gap-1">
                        <CalcButton variant="function" onClick={() => handleFunction("|x|")} size="small">|x|</CalcButton>
                        <CalcButton variant="function" onClick={() => handleFunction("%")} size="small">%</CalcButton>
                        <CalcButton variant="function" onClick={() => mode === "STAT" && setShowStatEditor(!showStatEditor)} size="small">
                            DATA
                        </CalcButton>
                        <CalcButton variant="action" size="wide" onClick={calculate}>=</CalcButton>
                    </div>

                    {/* Statistics Results */}
                    {mode === "STAT" && statData.length > 0 && (
                        <div className="mt-1 p-2 bg-slate-800/70 rounded-lg border border-slate-600/50 text-[10px] grid grid-cols-3 gap-1">
                            {(() => {
                                const stats = calcStats()
                                if (!stats) return null
                                return (
                                    <>
                                        <div className="text-slate-400">n={stats.n}</div>
                                        <div className="text-slate-400">x̄={formatNumber(stats.mean)}</div>
                                        <div className="text-slate-400">Σx={formatNumber(stats.sum)}</div>
                                        <div className="text-slate-400">σn={formatNumber(stats.stdDev)}</div>
                                        <div className="text-slate-400">min={stats.min}</div>
                                        <div className="text-slate-400">max={stats.max}</div>
                                    </>
                                )
                            })()}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 pb-2 text-center">
                    <p className="text-[8px] text-slate-500">
                        SHIFT: Inverse functions • ALPHA: Variables • ESC: Close
                    </p>
                </div>

                {/* History Panel */}
                {showHistory && history.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 mx-3 p-2 bg-slate-800 rounded-lg border border-slate-600 max-h-40 overflow-y-auto">
                        <div className="text-[10px] text-slate-400 mb-1 font-medium">History</div>
                        {history.slice().reverse().map((item, i) => (
                            <div key={i} className="text-[10px] text-slate-300 py-0.5 border-b border-slate-700/50">
                                {item}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
