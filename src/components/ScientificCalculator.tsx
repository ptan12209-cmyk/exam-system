"use client"

import { useState, useCallback, useEffect } from "react"
import { X, Delete, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScientificCalculatorProps {
    isOpen: boolean
    onClose: () => void
}

type CalcMode = "basic" | "scientific" | "statistics"

// Calculator button component
function CalcButton({
    children,
    onClick,
    className,
    variant = "default",
    size = "normal"
}: {
    children: React.ReactNode
    onClick: () => void
    className?: string
    variant?: "default" | "operator" | "function" | "number" | "action" | "special"
    size?: "normal" | "small"
}) {
    const variants = {
        default: "bg-slate-700 hover:bg-slate-600 text-white",
        operator: "bg-blue-600 hover:bg-blue-500 text-white",
        function: "bg-slate-600 hover:bg-slate-500 text-cyan-300",
        number: "bg-slate-800 hover:bg-slate-700 text-white",
        action: "bg-orange-600 hover:bg-orange-500 text-white",
        special: "bg-purple-600 hover:bg-purple-500 text-white"
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center justify-center rounded-lg font-medium transition-all active:scale-95",
                size === "small" ? "text-xs h-8" : "text-sm h-10",
                variants[variant],
                className
            )}
        >
            {children}
        </button>
    )
}

export function ScientificCalculator({ isOpen, onClose }: ScientificCalculatorProps) {
    const [display, setDisplay] = useState("0")
    const [expression, setExpression] = useState("")
    const [lastResult, setLastResult] = useState<number | null>(null)
    const [isRadians, setIsRadians] = useState(false)
    const [mode, setMode] = useState<CalcMode>("scientific")
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [memory, setMemory] = useState(0)
    const [history, setHistory] = useState<string[]>([])

    // Handle keyboard input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            if (e.key === "Escape") {
                onClose()
                return
            }

            // Prevent default for calculator keys when calculator is open
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
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, display, expression])

    const handleNumber = useCallback((num: string) => {
        if (display === "0" && num !== ".") {
            setDisplay(num)
        } else if (num === "." && display.includes(".")) {
            return
        } else {
            setDisplay(prev => prev + num)
        }
    }, [display])

    const handleOperator = useCallback((op: string) => {
        setExpression(prev => {
            const newExp = prev + display + " " + op + " "
            return newExp
        })
        setDisplay("0")
    }, [display])

    const handleFunction = useCallback((func: string) => {
        const num = parseFloat(display)
        let result: number

        switch (func) {
            // Trigonometric functions
            case "sin":
                result = isRadians ? Math.sin(num) : Math.sin(num * Math.PI / 180)
                break
            case "cos":
                result = isRadians ? Math.cos(num) : Math.cos(num * Math.PI / 180)
                break
            case "tan":
                result = isRadians ? Math.tan(num) : Math.tan(num * Math.PI / 180)
                break
            case "sin⁻¹":
                const sinInv = Math.asin(num)
                result = isRadians ? sinInv : sinInv * 180 / Math.PI
                break
            case "cos⁻¹":
                const cosInv = Math.acos(num)
                result = isRadians ? cosInv : cosInv * 180 / Math.PI
                break
            case "tan⁻¹":
                const tanInv = Math.atan(num)
                result = isRadians ? tanInv : tanInv * 180 / Math.PI
                break

            // Hyperbolic functions
            case "sinh":
                result = Math.sinh(num)
                break
            case "cosh":
                result = Math.cosh(num)
                break
            case "tanh":
                result = Math.tanh(num)
                break
            case "sinh⁻¹":
                result = Math.asinh(num)
                break
            case "cosh⁻¹":
                result = Math.acosh(num)
                break
            case "tanh⁻¹":
                result = Math.atanh(num)
                break

            // Logarithmic functions
            case "log":
                result = Math.log10(num)
                break
            case "ln":
                result = Math.log(num)
                break
            case "log₂":
                result = Math.log2(num)
                break
            case "10ˣ":
                result = Math.pow(10, num)
                break
            case "eˣ":
                result = Math.exp(num)
                break
            case "2ˣ":
                result = Math.pow(2, num)
                break

            // Power and root functions
            case "√":
                result = Math.sqrt(num)
                break
            case "∛":
                result = Math.cbrt(num)
                break
            case "x²":
                result = num * num
                break
            case "x³":
                result = num * num * num
                break
            case "1/x":
                result = 1 / num
                break
            case "x!":
                result = factorial(num)
                break
            case "|x|":
                result = Math.abs(num)
                break

            // Other functions
            case "±":
                result = -num
                break
            case "%":
                result = num / 100
                break
            case "π":
                result = Math.PI
                break
            case "e":
                result = Math.E
                break

            // Rounding functions
            case "⌊x⌋":
                result = Math.floor(num)
                break
            case "⌈x⌉":
                result = Math.ceil(num)
                break
            case "round":
                result = Math.round(num)
                break
            case "int":
                result = Math.trunc(num)
                break

            // Random
            case "Ran#":
                result = Math.random()
                break
            case "RanInt":
                result = Math.floor(Math.random() * (num + 1))
                break

            default:
                return
        }

        setDisplay(formatNumber(result))
        setLastResult(result)
    }, [display, isRadians])

    // Factorial function
    const factorial = (n: number): number => {
        if (n < 0) return NaN
        if (n === 0 || n === 1) return 1
        if (n > 170) return Infinity
        let result = 1
        for (let i = 2; i <= n; i++) {
            result *= i
        }
        return result
    }

    // GCD (Greatest Common Divisor)
    const gcd = (a: number, b: number): number => {
        a = Math.abs(Math.floor(a))
        b = Math.abs(Math.floor(b))
        while (b) {
            const t = b
            b = a % b
            a = t
        }
        return a
    }

    // LCM (Least Common Multiple)
    const lcm = (a: number, b: number): number => {
        return Math.abs(Math.floor(a) * Math.floor(b)) / gcd(a, b)
    }

    // Permutation nPr
    const permutation = (n: number, r: number): number => {
        if (r > n || r < 0 || n < 0) return 0
        return factorial(n) / factorial(n - r)
    }

    // Combination nCr
    const combination = (n: number, r: number): number => {
        if (r > n || r < 0 || n < 0) return 0
        return factorial(n) / (factorial(r) * factorial(n - r))
    }

    const handleTwoInputFunction = useCallback((func: string, secondValue: string) => {
        const a = parseFloat(display)
        const b = parseFloat(secondValue)
        let result: number

        switch (func) {
            case "GCD":
                result = gcd(a, b)
                break
            case "LCM":
                result = lcm(a, b)
                break
            case "nPr":
                result = permutation(a, b)
                break
            case "nCr":
                result = combination(a, b)
                break
            case "xʸ":
                result = Math.pow(a, b)
                break
            case "ʸ√x":
                result = Math.pow(a, 1 / b)
                break
            default:
                return
        }

        setDisplay(formatNumber(result))
        setLastResult(result)
    }, [display])

    const formatNumber = (num: number): string => {
        if (Number.isNaN(num)) return "Error"
        if (!Number.isFinite(num)) return num > 0 ? "∞" : "-∞"

        // Handle very small numbers
        if (Math.abs(num) < 1e-10 && num !== 0) {
            return num.toExponential(6)
        }

        // Handle very large numbers
        if (Math.abs(num) >= 1e10) {
            return num.toExponential(6)
        }

        // Round to avoid floating point errors
        const rounded = Math.round(num * 1e10) / 1e10
        return rounded.toString()
    }

    const calculate = useCallback(() => {
        try {
            const fullExpression = expression + display
            // Replace display operators with JS operators
            const jsExpression = fullExpression
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
                .replace(/\^/g, "**")
                .replace(/\s/g, "")

            // Use Function constructor for evaluation
            const result = new Function(`return ${jsExpression}`)()
            const formatted = formatNumber(result)

            // Add to history
            setHistory(prev => [...prev.slice(-9), `${fullExpression} = ${formatted}`])

            setExpression("")
            setDisplay(formatted)
            setLastResult(result)
        } catch {
            setDisplay("Error")
            setExpression("")
        }
    }, [expression, display])

    const handleClear = useCallback(() => {
        setDisplay("0")
        setExpression("")
    }, [])

    const handleAllClear = useCallback(() => {
        setDisplay("0")
        setExpression("")
        setLastResult(null)
    }, [])

    const handleDelete = useCallback(() => {
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0")
    }, [])

    const handleAns = useCallback(() => {
        if (lastResult !== null) {
            setDisplay(formatNumber(lastResult))
        }
    }, [lastResult])

    // Memory functions
    const handleMemoryPlus = useCallback(() => {
        setMemory(prev => prev + parseFloat(display))
    }, [display])

    const handleMemoryMinus = useCallback(() => {
        setMemory(prev => prev - parseFloat(display))
    }, [display])

    const handleMemoryRecall = useCallback(() => {
        setDisplay(formatNumber(memory))
    }, [memory])

    const handleMemoryClear = useCallback(() => {
        setMemory(0)
    }, [])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Calculator Panel */}
            <div className="relative w-full sm:w-[400px] max-h-[95vh] bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-800/80">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">🧮 fx-580VN X</span>
                        <button
                            onClick={() => setIsRadians(!isRadians)}
                            className={cn(
                                "px-2 py-0.5 text-[10px] rounded-full transition-colors font-medium",
                                isRadians
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-slate-700 text-slate-400"
                            )}
                        >
                            {isRadians ? "RAD" : "DEG"}
                        </button>
                        {memory !== 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded-full">
                                M
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Display - LCD style like fx-580VN X */}
                <div className="px-3 py-3 bg-slate-900/50">
                    <div className="bg-gradient-to-b from-[#c5d6c5] to-[#a8c4a8] rounded-lg p-2 font-mono border-2 border-slate-600 shadow-inner">
                        {/* Expression line */}
                        <div className="text-right text-slate-600 text-[10px] h-3 truncate">
                            {expression || " "}
                        </div>
                        {/* Result line */}
                        <div className="text-right text-slate-900 text-xl font-bold truncate">
                            {display}
                        </div>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-1 px-3 pb-2">
                    {(["basic", "scientific", "statistics"] as CalcMode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={cn(
                                "flex-1 py-1 text-[10px] rounded-lg font-medium transition-colors",
                                mode === m
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                            )}
                        >
                            {m === "basic" ? "Cơ bản" : m === "scientific" ? "Khoa học" : "Thống kê"}
                        </button>
                    ))}
                </div>

                {/* Toggle Advanced */}
                {mode === "scientific" && (
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-slate-400 hover:text-white transition-colors"
                    >
                        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {showAdvanced ? "Ẩn nâng cao" : "Hiện nâng cao"}
                    </button>
                )}

                {/* Buttons Container */}
                <div className="p-2 space-y-1.5 max-h-[50vh] overflow-y-auto">
                    {/* Advanced Scientific Functions (collapsible) */}
                    {mode === "scientific" && showAdvanced && (
                        <div className="grid grid-cols-6 gap-1 pb-1 border-b border-slate-700/50">
                            {/* Inverse Trig */}
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("sin⁻¹")}>sin⁻¹</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("cos⁻¹")}>cos⁻¹</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("tan⁻¹")}>tan⁻¹</CalcButton>
                            {/* Hyperbolic */}
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("sinh")}>sinh</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("cosh")}>cosh</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("tanh")}>tanh</CalcButton>

                            {/* More functions */}
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("∛")}>∛</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("x!")}>n!</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("|x|")}>|x|</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("log₂")}>log₂</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("2ˣ")}>2ˣ</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("Ran#")}>Ran#</CalcButton>

                            {/* Rounding */}
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("⌊x⌋")}>⌊x⌋</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("⌈x⌉")}>⌈x⌉</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("int")}>Int</CalcButton>
                            <CalcButton size="small" variant="function" onClick={() => handleFunction("round")}>Rnd</CalcButton>
                            {/* Memory */}
                            <CalcButton size="small" variant="special" onClick={handleMemoryPlus}>M+</CalcButton>
                            <CalcButton size="small" variant="special" onClick={handleMemoryMinus}>M-</CalcButton>
                        </div>
                    )}

                    {/* Main Button Grid */}
                    <div className="grid grid-cols-5 gap-1">
                        {mode === "scientific" && (
                            <>
                                {/* Row 1 - Trig functions */}
                                <CalcButton variant="function" onClick={() => handleFunction("sin")}>sin</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("cos")}>cos</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("tan")}>tan</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("log")}>log</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("ln")}>ln</CalcButton>

                                {/* Row 2 - Power functions */}
                                <CalcButton variant="function" onClick={() => handleFunction("√")}>√</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("x²")}>x²</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("x³")}>x³</CalcButton>
                                <CalcButton variant="function" onClick={() => handleOperator("^")}>xʸ</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("10ˣ")}>10ˣ</CalcButton>

                                {/* Row 3 - Constants & special */}
                                <CalcButton variant="function" onClick={() => handleFunction("π")}>π</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("e")}>e</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("eˣ")}>eˣ</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("1/x")}>1/x</CalcButton>
                                <CalcButton variant="function" onClick={() => handleFunction("±")}>±</CalcButton>
                            </>
                        )}

                        {/* Row 4 - Clear, parentheses, operators */}
                        <CalcButton variant="action" onClick={handleAllClear}>AC</CalcButton>
                        <CalcButton variant="default" onClick={() => setDisplay(prev => prev === "0" ? "(" : prev + "(")}>(</CalcButton>
                        <CalcButton variant="default" onClick={() => setDisplay(prev => prev + ")")}>)</CalcButton>
                        <CalcButton variant="default" onClick={handleDelete}><Delete className="w-4 h-4" /></CalcButton>
                        <CalcButton variant="operator" onClick={() => handleOperator("÷")}>÷</CalcButton>

                        {/* Row 5 - Numbers 7-9, multiply */}
                        <CalcButton variant="number" onClick={() => handleNumber("7")}>7</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("8")}>8</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("9")}>9</CalcButton>
                        <CalcButton variant="operator" onClick={() => handleOperator("×")}>×</CalcButton>
                        <CalcButton variant="function" onClick={handleAns}>Ans</CalcButton>

                        {/* Row 6 - Numbers 4-6, subtract */}
                        <CalcButton variant="number" onClick={() => handleNumber("4")}>4</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("5")}>5</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("6")}>6</CalcButton>
                        <CalcButton variant="operator" onClick={() => handleOperator("-")}>−</CalcButton>
                        <CalcButton variant="special" onClick={handleMemoryRecall}>MR</CalcButton>

                        {/* Row 7 - Numbers 1-3, add */}
                        <CalcButton variant="number" onClick={() => handleNumber("1")}>1</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("2")}>2</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("3")}>3</CalcButton>
                        <CalcButton variant="operator" onClick={() => handleOperator("+")}>+</CalcButton>
                        <CalcButton variant="special" onClick={handleMemoryClear}>MC</CalcButton>

                        {/* Row 8 - 0, decimal, equals */}
                        <CalcButton variant="number" onClick={() => handleNumber("0")}>0</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber("00")}>00</CalcButton>
                        <CalcButton variant="number" onClick={() => handleNumber(".")}>.</CalcButton>
                        <CalcButton variant="action" className="col-span-2" onClick={calculate}>=</CalcButton>
                    </div>
                </div>

                {/* Footer hint */}
                <div className="px-3 pb-2 text-center border-t border-slate-700/50 pt-2">
                    <p className="text-[9px] text-slate-500">
                        Phím tắt: <kbd className="px-1 bg-slate-700 rounded">ESC</kbd> đóng • <kbd className="px-1 bg-slate-700 rounded">0-9</kbd> số • <kbd className="px-1 bg-slate-700 rounded">+-*/</kbd> phép tính
                    </p>
                </div>
            </div>
        </div>
    )
}
