"use client"

import { useState, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ScientificCalculatorProps {
    isOpen: boolean
    onClose: () => void
}

type AngleMode = "D" | "R" | "G"

// Exact fx-580VN X button with shift/alpha labels above
function Key({
    main,
    shift,
    alpha,
    onClick,
    color = "dark",
    size = 1
}: {
    main: React.ReactNode
    shift?: string
    alpha?: string
    onClick: () => void
    color?: "dark" | "gray" | "orange" | "number"
    size?: number
}) {
    const colors = {
        dark: "bg-[#2d3748] hover:bg-[#3d4758] border-[#1d2738] text-white",
        gray: "bg-[#4a5568] hover:bg-[#5a6578] border-[#3a4558] text-white",
        orange: "bg-[#dd6b20] hover:bg-[#ed7b30] border-[#cd5b10] text-white font-bold",
        number: "bg-[#1a202c] hover:bg-[#2a303c] border-[#0a101c] text-white text-sm"
    }

    return (
        <div className={cn("flex flex-col", size > 1 && `col-span-${size}`)}>
            <div className="flex justify-between px-0.5 text-[6px] h-2.5 leading-none">
                <span className="text-yellow-400 truncate">{shift || ""}</span>
                <span className="text-red-400 truncate">{alpha || ""}</span>
            </div>
            <button
                onClick={onClick}
                className={cn(
                    "h-6 rounded text-[9px] font-medium transition-all active:scale-95 border-b",
                    colors[color],
                    size > 1 && "col-span-2"
                )}
                style={size > 1 ? { gridColumn: `span ${size}` } : {}}
            >
                {main}
            </button>
        </div>
    )
}

export function ScientificCalculator({ isOpen, onClose }: ScientificCalculatorProps) {
    const [display, setDisplay] = useState("0")
    const [expression, setExpression] = useState("")
    const [angleMode, setAngleMode] = useState<AngleMode>("D")
    const [shift, setShift] = useState(false)
    const [alpha, setAlpha] = useState(false)
    const [memory, setMemory] = useState(0)
    const [ans, setAns] = useState(0)

    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (!isOpen) return
            if (e.key === "Escape") { onClose(); return }
            if (e.key >= "0" && e.key <= "9") { e.preventDefault(); input(e.key) }
            if (e.key === ".") { e.preventDefault(); input(".") }
            if (e.key === "+") { e.preventDefault(); op("+") }
            if (e.key === "-") { e.preventDefault(); op("-") }
            if (e.key === "*") { e.preventDefault(); op("×") }
            if (e.key === "/") { e.preventDefault(); op("÷") }
            if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calc() }
            if (e.key === "Backspace") { e.preventDefault(); del() }
        }
        window.addEventListener("keydown", handle)
        return () => window.removeEventListener("keydown", handle)
    }, [isOpen, display, expression])

    const input = (n: string) => {
        setShift(false); setAlpha(false)
        if (display === "0" && n !== ".") setDisplay(n)
        else if (n === "." && display.includes(".")) return
        else setDisplay(d => d + n)
    }

    const op = (o: string) => {
        setExpression(e => e + display + o)
        setDisplay("0")
        setShift(false); setAlpha(false)
    }

    const toR = (v: number) => angleMode === "D" ? v * Math.PI / 180 : angleMode === "G" ? v * Math.PI / 200 : v
    const fromR = (v: number) => angleMode === "D" ? v * 180 / Math.PI : angleMode === "G" ? v * 200 / Math.PI : v

    const fn = (f: string) => {
        const n = parseFloat(display)
        let r: number
        switch (f) {
            case "sin": r = Math.sin(toR(n)); break
            case "cos": r = Math.cos(toR(n)); break
            case "tan": r = Math.tan(toR(n)); break
            case "sin⁻¹": r = fromR(Math.asin(n)); break
            case "cos⁻¹": r = fromR(Math.acos(n)); break
            case "tan⁻¹": r = fromR(Math.atan(n)); break
            case "sinh": r = Math.sinh(n); break
            case "cosh": r = Math.cosh(n); break
            case "tanh": r = Math.tanh(n); break
            case "log": r = Math.log10(n); break
            case "ln": r = Math.log(n); break
            case "10^x": r = Math.pow(10, n); break
            case "e^x": r = Math.exp(n); break
            case "√": r = Math.sqrt(n); break
            case "∛": r = Math.cbrt(n); break
            case "x²": r = n * n; break
            case "x³": r = n * n * n; break
            case "x⁻¹": r = 1 / n; break
            case "n!": r = fact(n); break
            case "neg": r = -n; break
            case "π": r = Math.PI; break
            case "e": r = Math.E; break
            case "%": r = n / 100; break
            case "Abs": r = Math.abs(n); break
            default: return
        }
        setDisplay(fmt(r))
        setAns(r)
        setShift(false); setAlpha(false)
    }

    const fact = (n: number): number => {
        if (n < 0 || !Number.isInteger(n)) return NaN
        if (n <= 1) return 1
        let r = 1; for (let i = 2; i <= n; i++) r *= i
        return r
    }

    const fmt = (n: number): string => {
        if (Number.isNaN(n)) return "Math ERROR"
        if (!Number.isFinite(n)) return n > 0 ? "∞" : "-∞"
        const abs = Math.abs(n)
        if (abs !== 0 && (abs < 1e-10 || abs >= 1e10)) return n.toExponential(6)
        return String(Math.round(n * 1e10) / 1e10)
    }

    const calc = () => {
        try {
            const expr = (expression + display).replace(/×/g, "*").replace(/÷/g, "/")
            const r = new Function(`return ${expr}`)()
            setAns(r); setExpression(""); setDisplay(fmt(r))
        } catch { setDisplay("Syntax ERROR") }
        setShift(false); setAlpha(false)
    }

    const ac = () => { setDisplay("0"); setExpression("") }
    const del = () => setDisplay(d => d.length > 1 ? d.slice(0, -1) : "0")

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2">
            <div className="absolute inset-0 bg-black/80" onClick={onClose} />

            {/* fx-580VN X Body */}
            <div className="relative w-[300px] bg-gradient-to-b from-[#2d3748] to-[#1a202c] rounded-lg shadow-2xl overflow-hidden"
                style={{ border: "3px solid #b7791f" }}>

                {/* Brand */}
                <div className="bg-[#1a202c] px-2 py-1 flex justify-between items-center">
                    <span className="text-[8px] text-gray-400 font-bold">CASIO</span>
                    <span className="text-[7px] text-gray-500 italic">fx-580VN X</span>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
                </div>

                {/* Solar Panel Area */}
                <div className="mx-2 h-2 bg-gradient-to-r from-[#1a1a2e] via-[#2d2d44] to-[#1a1a2e] rounded-sm" />

                {/* LCD */}
                <div className="mx-2 my-1.5 bg-gradient-to-b from-[#9ae6b4] to-[#68d391] rounded p-1.5 border border-[#38a169]">
                    <div className="flex justify-between text-[7px] text-[#1a4731]">
                        <span className="font-bold">{angleMode === "D" ? "D" : angleMode === "R" ? "R" : "G"}</span>
                        <span>{memory !== 0 ? "M" : ""}</span>
                        <span className="font-bold">{shift ? "S" : alpha ? "A" : ""}</span>
                    </div>
                    <div className="text-right text-[#1a4731] text-[8px] truncate font-mono">{expression || "\u00A0"}</div>
                    <div className="text-right text-[#0d3320] text-lg font-bold font-mono truncate">{display}</div>
                </div>

                {/* CLASSWIZ label */}
                <div className="text-center text-[6px] text-gray-500 tracking-widest">CLASSWIZ</div>

                {/* Control Row: SHIFT, ALPHA, D-PAD, MODE, ON */}
                <div className="flex items-center justify-between px-1.5 py-1">
                    <div className="flex gap-0.5">
                        <button onClick={() => { setShift(!shift); setAlpha(false) }}
                            className={cn("px-1.5 py-0.5 text-[7px] rounded font-bold", shift ? "bg-yellow-400 text-black" : "bg-[#2d3748] text-yellow-400 border border-yellow-400/30")}>
                            SHIFT
                        </button>
                        <button onClick={() => { setAlpha(!alpha); setShift(false) }}
                            className={cn("px-1.5 py-0.5 text-[7px] rounded font-bold", alpha ? "bg-red-500 text-white" : "bg-[#2d3748] text-red-400 border border-red-400/30")}>
                            ALPHA
                        </button>
                    </div>

                    {/* D-Pad */}
                    <div className="flex flex-col items-center scale-75">
                        <button className="w-4 h-3 bg-[#2d3748] rounded-t-full text-[6px] text-white border border-gray-600">▲</button>
                        <div className="flex">
                            <button className="w-3 h-4 bg-[#2d3748] rounded-l-full text-[6px] text-white border border-gray-600">◀</button>
                            <button className="w-5 h-4 bg-[#374151] text-[5px] text-white font-bold border-y border-gray-600">MODE</button>
                            <button className="w-3 h-4 bg-[#2d3748] rounded-r-full text-[6px] text-white border border-gray-600">▶</button>
                        </div>
                        <button className="w-4 h-3 bg-[#2d3748] rounded-b-full text-[6px] text-white border border-gray-600">▼</button>
                    </div>

                    <div className="flex gap-0.5">
                        <button onClick={() => setAngleMode(angleMode === "D" ? "R" : angleMode === "R" ? "G" : "D")}
                            className="px-1 py-0.5 text-[6px] bg-[#2d3748] text-cyan-400 rounded border border-cyan-400/30">
                            {angleMode === "D" ? "DEG" : angleMode === "R" ? "RAD" : "GRA"}
                        </button>
                        <button className="px-1 py-0.5 text-[6px] bg-[#2d3748] text-green-400 rounded border border-green-400/30">ON</button>
                    </div>
                </div>

                {/* Keypad */}
                <div className="p-1.5 grid grid-cols-6 gap-0.5">
                    {/* Row 1: OPTN CALC ∫ FRAC √ x² */}
                    <Key main="OPTN" shift="x=" onClick={() => { }} />
                    <Key main="CALC" shift="SOLVE" onClick={() => { }} />
                    <Key main="∫" shift="d/dx" onClick={() => { }} />
                    <Key main="□/□" shift="ab/c" onClick={() => { }} />
                    <Key main="√" shift="∛" onClick={() => fn(shift ? "∛" : "√")} />
                    <Key main="x²" shift="x³" onClick={() => fn(shift ? "x³" : "x²")} />

                    {/* Row 2: x^y log ln (-) ° hyp */}
                    <Key main="x^□" shift="ˣ√" onClick={() => op("^")} />
                    <Key main="log" shift="10ˣ" onClick={() => fn(shift ? "10^x" : "log")} />
                    <Key main="ln" shift="eˣ" onClick={() => fn(shift ? "e^x" : "ln")} />
                    <Key main="(-)" onClick={() => fn("neg")} />
                    <Key main="°′″" shift="←" onClick={() => { }} />
                    <Key main="hyp" shift="Abs" onClick={() => shift && fn("Abs")} />

                    {/* Row 3: sin cos tan ( ) S⇔D */}
                    <Key main="sin" shift="sin⁻¹" alpha="D" onClick={() => fn(shift ? "sin⁻¹" : "sin")} />
                    <Key main="cos" shift="cos⁻¹" alpha="E" onClick={() => fn(shift ? "cos⁻¹" : "cos")} />
                    <Key main="tan" shift="tan⁻¹" alpha="F" onClick={() => fn(shift ? "tan⁻¹" : "tan")} />
                    <Key main="(" alpha="X" onClick={() => setDisplay(d => d === "0" ? "(" : d + "(")} />
                    <Key main=")" alpha="Y" onClick={() => setDisplay(d => d + ")")} />
                    <Key main="S⇔D" shift="M:" onClick={() => { }} />

                    {/* Row 4: RCL ENG ( , M+ DEL */}
                    <Key main="RCL" shift="STO" alpha="A" onClick={() => setDisplay(fmt(memory))} />
                    <Key main="ENG" shift="←" alpha="B" onClick={() => { }} />
                    <Key main="(" shift="%" alpha="C" onClick={() => shift ? fn("%") : setDisplay(d => d === "0" ? "(" : d + "(")} />
                    <Key main="," onClick={() => setDisplay(d => d + ",")} color="gray" />
                    <Key main="M+" shift="M-" onClick={() => shift ? setMemory(m => m - parseFloat(display)) : setMemory(m => m + parseFloat(display))} color="gray" />
                    <Key main="DEL" shift="INS" onClick={del} color="orange" />

                    {/* Row 5: 7 8 9 AC ÷ */}
                    <Key main="7" onClick={() => input("7")} color="number" />
                    <Key main="8" onClick={() => input("8")} color="number" />
                    <Key main="9" onClick={() => input("9")} color="number" />
                    <Key main="AC" shift="OFF" onClick={ac} color="orange" />
                    <Key main="÷" onClick={() => op("÷")} color="gray" />
                    <Key main="×" onClick={() => op("×")} color="gray" />

                    {/* Row 6: 4 5 6 - + */}
                    <Key main="4" onClick={() => input("4")} color="number" />
                    <Key main="5" onClick={() => input("5")} color="number" />
                    <Key main="6" onClick={() => input("6")} color="number" />
                    <Key main="-" onClick={() => op("-")} color="gray" />
                    <Key main="+" onClick={() => op("+")} color="gray" />
                    <Key main="Ans" shift="PreAns" onClick={() => setDisplay(fmt(ans))} color="gray" />

                    {/* Row 7: 1 2 3 ×10^x = = */}
                    <Key main="1" alpha="x" onClick={() => input("1")} color="number" />
                    <Key main="2" alpha="y" onClick={() => input("2")} color="number" />
                    <Key main="3" alpha="π" onClick={() => alpha ? fn("π") : input("3")} color="number" />
                    <Key main="×10ˣ" onClick={() => setDisplay(d => d + "e")} color="gray" />
                    <Key main="=" onClick={calc} color="orange" />
                    <Key main="=" onClick={calc} color="orange" />

                    {/* Row 8: 0 . x! x⁻¹ */}
                    <Key main="0" onClick={() => input("0")} color="number" />
                    <Key main="." shift="Ran#" alpha="e" onClick={() => alpha ? fn("e") : input(".")} color="number" />
                    <Key main="x!" shift="nPr" onClick={() => fn("n!")} color="number" />
                    <Key main="x⁻¹" shift="nCr" onClick={() => fn("x⁻¹")} color="gray" />
                    <Key main=",," onClick={() => { }} color="gray" />
                    <Key main="" onClick={() => { }} color="gray" />
                </div>

                {/* Footer */}
                <div className="px-2 pb-1.5 text-center">
                    <div className="text-[5px] text-gray-500 tracking-[0.2em]">NATURAL TEXTBOOK DISPLAY</div>
                </div>
            </div>
        </div>
    )
}
