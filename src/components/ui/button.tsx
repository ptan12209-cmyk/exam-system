import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[color,transform,box-shadow,background-color,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-sm hover:bg-[hsl(var(--foreground))]/90 hover:shadow-md",
                destructive:
                    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
                outline:
                    "border border-[hsl(var(--border))]/70 bg-transparent text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/20",
                secondary:
                    "bg-[hsl(var(--muted))]/20 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/35",
                ghost: "bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/20",
                link: "text-[hsl(var(--foreground))] underline-offset-4 hover:underline",
                success:
                    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
            },
            size: {
                default: "h-10 px-4 py-2.5",
                sm: "h-9 rounded-full px-3 text-xs",
                lg: "h-11 rounded-full px-6",
                icon: "h-10 w-10 p-0",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
