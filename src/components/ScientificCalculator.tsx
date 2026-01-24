"use client"

import { useState, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ScientificCalculatorProps {
    isOpen: boolean
    onClose: () => void
}

type AngleMode = "D" | "R" | "G" // DEG, RAD, GRAD

// fx-580VN X exact button component
function CalcKey({
    main,
    shift,
    alpha,
    onClick,
    className,
    variant = "default",
    wide = false
}: {
    main: React.ReactNode
    shift?: string
    alpha?: string
    onClick: () => void
    className?: string
    variant?: "default" | "dark" | "yellow" | "red" | "gray"
    wide?: boolean
}) {
    const variants = {
        default: "bg-[#3d4a5c] hover:bg-[#4d5a6c] text-white border-[#2d3a4c]",
        dark: "bg-[#2a3444] hover:bg-[#3a4454] text-white border-[#1a2434]",
        yellow: "bg-[#d4a82f] hover:bg-[#e4b83f] text-black border-[#b4881f] font-bold",
        red: "bg-[#c45c5c] hover:bg-[#d46c6c] text-white border-[#a43c3c] font-bold",
        gray: "bg-[#5a6a7a] hover:bg-[#6a7a8a] text-white border-[#4a5a6a]"
    }

    return (
        <div className={cn("flex flex-col items-center", wide && "col-span-2")}>
            {/* SHIFT/ALPHA labels above key */}
            <div className="flex justify-between w-full px-0.5 h-3 text-[7px] leading-none">
                <span className="text-yellow-400 truncate">{shift || ""}</span>
                <span className="text-red-400 truncate">{alpha || ""}</span>
            </div>
            <button
                onClick={onClick}
                className={cn(
                    "w-full h-7 rounded-sm text-[10px] font-medium transition-all active:scale-95 border-b-2",
                    variants[variant],
                    className
                )}
            >
                {main}
            </button>
        </div>
    )
}

export function ScientificCalculator({ isOpen, onClose }: ScientificCalculatorProps) {
    // States
    const [display, setDisplay] = useState("0")
    const [expression, setExpression] = useState("")
    const [angleMode, setAngleMode] = useState<AngleMode>("D")
    const [shiftActive, setShiftActive] = useState(false)
    const [alphaActive, setAlphaActive] = useState(false)
    const [memory, setMemory] = useState(0)
    const [ans, setAns] = useState(0)

    // Keyboard handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return
            if (e.key === "Escape") { onClose(); return }
            if (e.key >= "0" && e.key <= "9") { e.preventDefault(); inputNumber(e.key) }
            if (e.key === ".") { e.preventDefault(); inputNumber(".") }
            if (e.key === "+") { e.preventDefault(); inputOperator("+") }
            if (e.key === "-") { e.preventDefault(); inputOperator("-") }
            if (e.key === "*") { e.preventDefault(); inputOperator("×") }
            if (e.key === "/") { e.preventDefault(); inputOperator("÷") }
            if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calculate() }
            if (e.key === "Backspace") { e.preventDefault(); handleDEL() }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, display, expression])

    // Input functions
    const inputNumber = useCallback((n: string) => {
        setShiftActive(false); setAlphaActive(false)
        if (display === "0" && n !== ".") setDisplay(n)
        else if (n === "." && display.includes(".")) return
        else setDisplay(prev => prev + n)
    }, [display])

    const inputOperator = useCallback((op: string) => {
        setExpression(prev => prev + display + op)
        setDisplay("0")
        setShiftActive(false); setAlphaActive(false)
    }, [display])

    const toRad = (v: number) => angleMode === "D" ? v * Math.PI / 180 : angleMode === "G" ? v * Math.PI / 200 : v
    const fromRad = (v: number) => angleMode === "D" ? v * 180 / Math.PI : angleMode === "G" ? v * 200 / Math.PI : v

    const applyFunction = useCallback((fn: string) => {
        const n = parseFloat(display)
        let r: number
        switch (fn) {
            case "sin": r = Math.sin(toRad(n)); break
            case "cos": r = Math.cos(toRad(n)); break
            case "tan": r = Math.tan(toRad(n)); break
            case "sin⁻¹": r = fromRad(Math.asin(n)); break
            case "cos⁻¹": r = fromRad(Math.acos(n)); break
            case "tan⁻¹": r = fromRad(Math.atan(n)); break
            case "log": r = Math.log10(n); break
            case "ln": r = Math.log(n); break
            case "10^x": r = Math.pow(10, n); break
            case "e^x": r = Math.exp(n); break
            case "√": r = Math.sqrt(n); break
            case "∛": r = Math.cbrt(n); break
            case "x²": r = n * n; break
            case "x³": r = n * n * n; break
            case "x⁻¹": r = 1 / n; break
            case "x!": r = factorial(n); break
            case "(-)": r = -n; break
            case "π": r = Math.PI; break
            case "e": r = Math.E; break
            case "%": r = n / 100; break
            case "Abs": r = Math.abs(n); break
            default: return
        }
        setDisplay(format(r))
        setAns(r)
        setShiftActive(false); setAlphaActive(false)
    }, [display, angleMode])

    const factorial = (n: number): number => {
        if (n < 0 || !Number.isInteger(n)) return NaN
        if (n <= 1) return 1
        let r = 1; for (let i = 2; i <= n; i++) r *= i
        return r
    }

    const format = (n: number): string => {
        if (Number.isNaN(n)) return "Math ERROR"
        if (!Number.isFinite(n)) return n > 0 ? "∞" : "-∞"
        if (Math.abs(n) < 1e-10 && n !== 0) return n.toExponential(6)
        if (Math.abs(n) >= 1e10) return n.toExponential(6)
        return (Math.round(n * 1e10) / 1e10).toString()
    }

    const calculate = useCallback(() => {
        try {
            const expr = (expression + display).replace(/×/g, "*").replace(/÷/g, "/")
            const result = new Function(`return ${expr}`)()
            setAns(result)
            setExpression("")
            setDisplay(format(result))
        } catch { setDisplay("Syntax ERROR") }
        setShiftActive(false); setAlphaActive(false)
    }, [expression, display])

    const handleAC = () => { setDisplay("0"); setExpression("") }
    const handleDEL = () => setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0")
    const handleAns = () => setDisplay(format(ans))
    const handleM = (op: "+" | "-" | "R" | "C") => {
        if (op === "+") setMemory(m => m + parseFloat(display))
        else if (op === "-") setMemory(m => m - parseFloat(display))
        else if (op === "R") setDisplay(format(memory))
        else setMemory(0)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            {/* Calculator body - fx-580VN X exact style */}
            <div className="relative w-[320px] bg-gradient-to-b from-[#3a4a5f] to-[#2a3a4f] rounded-xl shadow-2xl border-2 border-[#c4a42f] overflow-hidden">

                {/* Top brand area */}
                <div className="bg-[#2a3a4f] px-3 py-1.5 flex justify-between items-center border-b border-[#4a5a6f]">
                    <span className="text-[10px] text-gray-400 font-bold tracking-wider">CASIO</span>
                    <span className="text-[8px] text-gray-500">fx-580VN X</span>
                </div>

                {/* LCD Display */}
                <div className="mx-2 my-2 bg-gradient-to-b from-[#a8c8a8] to-[#88a888] rounded p-2 border border-[#687868] shadow-inner">
                    <div className="flex justify-between text-[8px] text-[#2a4a2a] mb-0.5">
                        <span>{angleMode}</span>
                        <span>{memory !== 0 ? "M" : ""}</span>
                        <span>{shiftActive ? "SHIFT" : alphaActive ? "ALPHA" : ""}</span>
                    </div>
                    <div className="text-right text-[#1a3a1a] text-[9px] h-3 truncate font-mono">{expression || " "}</div>
                    <div className="text-right text-[#0a2a0a] text-lg font-bold font-mono truncate">{display}</div>
                </div>

                {/* Navigation row */}
                <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex gap-1">
                        <button onClick={() => setShiftActive(!shiftActive)}
                            className={cn("px-2 py-1 text-[8px] rounded font-bold", shiftActive ? "bg-yellow-500 text-black" : "bg-[#2a3444] text-yellow-400")}>
                            SHIFT
                        </button>
                        <button onClick={() => setAlphaActive(!alphaActive)}
                            className={cn("px-2 py-1 text-[8px] rounded font-bold", alphaActive ? "bg-red-500 text-white" : "bg-[#2a3444] text-red-400")}>
                            ALPHA
                        </button>
                    </div>

                    {/* D-pad */}
                    <div className="flex flex-col items-center">
                        <button className="w-5 h-4 bg-[#2a3444] rounded-t text-[8px] text-white">▲</button>
                        <div className="flex">
                            <button className="w-4 h-5 bg-[#2a3444] rounded-l text-[8px] text-white">◀</button>
                            <button className="w-6 h-5 bg-[#3a4454] text-[7px] text-white font-bold">MODE</button>
                            <button className="w-4 h-5 bg-[#2a3444] rounded-r text-[8px] text-white">▶</button>
                        </div>
                        <button className="w-5 h-4 bg-[#2a3444] rounded-b text-[8px] text-white">▼</button>
                    </div>

                    <div className="flex gap-1">
                        <button onClick={() => setAngleMode(angleMode === "D" ? "R" : angleMode === "R" ? "G" : "D")}
                            className="px-2 py-1 text-[8px] bg-[#2a3444] text-cyan-400 rounded">
                            {angleMode === "D" ? "DEG" : angleMode === "R" ? "RAD" : "GRA"}
                        </button>
                        <button onClick={onClose} className="px-2 py-1 text-[8px] bg-[#2a3444] text-red-400 rounded">✕</button>
                    </div>
                </div>

                {/* Keypad - Exact fx-580VN X layout */}
                <div className="p-2 grid grid-cols-6 gap-1">
                    {/* Row 1 */}
                    <CalcKey main="OPTN" shift="x=" onClick={() => { }} />
                    <CalcKey main="CALC" shift="SOLVE" onClick={() => { }} />
                    <CalcKey main="∫" shift="d/dx" onClick={() => { }} />
                    <CalcKey main="□/□" shift="a b/c" onClick={() => { }} />
                    <CalcKey main="√" shift="∛" onClick={() => applyFunction(shiftActive ? "∛" : "√")} />
                    <CalcKey main="x²" shift="x³" onClick={() => applyFunction(shiftActive ? "x³" : "x²")} />

                    {/* Row 2 */}
                    <CalcKey main="x^□" shift="ˣ√" onClick={() => inputOperator("^")} />
                    <CalcKey main="log" shift="10^x" onClick={() => applyFunction(shiftActive ? "10^x" : "log")} />
                    <CalcKey main="ln" shift="e^x" onClick={() => applyFunction(shiftActive ? "e^x" : "ln")} />
                    <CalcKey main="(-)" onClick={() => applyFunction("(-)")} />
                    <CalcKey main="°′″" shift="←" onClick={() => { }} />
                    <CalcKey main="hyp" shift="Abs" onClick={() => shiftActive && applyFunction("Abs")} />

                    {/* Row 3 - Trig */}
                    <CalcKey main="sin" shift="sin⁻¹" alpha="D" onClick={() => applyFunction(shiftActive ? "sin⁻¹" : "sin")} />
                    <CalcKey main="cos" shift="cos⁻¹" alpha="E" onClick={() => applyFunction(shiftActive ? "cos⁻¹" : "cos")} />
                    <CalcKey main="tan" shift="tan⁻¹" alpha="F" onClick={() => applyFunction(shiftActive ? "tan⁻¹" : "tan")} />
                    <CalcKey main="(" alpha="X" onClick={() => setDisplay(prev => prev === "0" ? "(" : prev + "(")} />
                    <CalcKey main=")" alpha="Y" onClick={() => setDisplay(prev => prev + ")")} />
                    <CalcKey main="S⇔D" shift="M:" onClick={() => { }} />

                    {/* Row 4 */}
                    <CalcKey main="RCL" shift="STO" alpha="A" onClick={() => handleM("R")} />
                    <CalcKey main="ENG" shift="←" alpha="B" onClick={() => { }} />
                    <CalcKey main="(" shift="%" alpha="C" onClick={() => shiftActive ? applyFunction("%") : setDisplay(prev => prev === "0" ? "(" : prev + "(")} />
                    <CalcKey main="," onClick={() => setDisplay(prev => prev + ",")} variant="gray" />
                    <CalcKey main="M+" shift="M-" onClick={() => handleM(shiftActive ? "-" : "+")} variant="gray" />
                    <CalcKey main="DEL" shift="INS" onClick={handleDEL} variant="gray" />

                    {/* Row 5 - Numbers 7,8,9 */}
                    <CalcKey main="7" onClick={() => inputNumber("7")} variant="dark" />
                    <CalcKey main="8" onClick={() => inputNumber("8")} variant="dark" />
                    <CalcKey main="9" onClick={() => inputNumber("9")} variant="dark" />
                    <CalcKey main="AC" onClick={handleAC} variant="gray" />
                    <CalcKey main="÷" onClick={() => inputOperator("÷")} variant="gray" />
                    <CalcKey main="×" onClick={() => inputOperator("×")} variant="gray" />

                    {/* Row 6 - Numbers 4,5,6 */}
                    <CalcKey main="4" onClick={() => inputNumber("4")} variant="dark" />
                    <CalcKey main="5" onClick={() => inputNumber("5")} variant="dark" />
                    <CalcKey main="6" onClick={() => inputNumber("6")} variant="dark" />
                    <CalcKey main="-" onClick={() => inputOperator("-")} variant="gray" />
                    <CalcKey main="+" onClick={() => inputOperator("+")} variant="gray" />
                    <CalcKey main="Ans" shift="PreAns" onClick={handleAns} variant="gray" />

                    {/* Row 7 - Numbers 1,2,3 + EXE */}
                    <CalcKey main="1" alpha="x" onClick={() => inputNumber("1")} variant="dark" />
                    <CalcKey main="2" alpha="y" onClick={() => inputNumber("2")} variant="dark" />
                    <CalcKey main="3" alpha="π" onClick={() => alphaActive ? applyFunction("π") : inputNumber("3")} variant="dark" />
                    <CalcKey main="×10^x" onClick={() => setDisplay(prev => prev + "e")} variant="gray" />
                    <CalcKey main="=" onClick={calculate} variant="yellow" wide />

                    {/* Row 8 - 0, ., etc */}
                    <CalcKey main="0" onClick={() => inputNumber("0")} variant="dark" />
                    <CalcKey main="." shift="Ran#" alpha="e" onClick={() => alphaActive ? applyFunction("e") : inputNumber(".")} variant="dark" />
                    <CalcKey main="x!" shift="nPr" onClick={() => applyFunction("x!")} variant="dark" />
                    <CalcKey main="x⁻¹" shift="nCr" onClick={() => applyFunction("x⁻¹")} variant="gray" />
                </div>

                {/* Footer */}
                <div className="px-2 pb-2 text-center">
                    <p className="text-[7px] text-gray-500">NATURAL TEXTBOOK DISPLAY</p>
                </div>
            </div>
        </div>
    )
}
