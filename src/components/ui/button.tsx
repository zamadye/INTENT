import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_30px_hsl(189_100%_50%/0.4)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground hover:border-primary/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Arc Campaign Engine variants
        gradient: "bg-cyber-gradient text-primary-foreground font-semibold hover:shadow-[0_0_40px_hsl(189_100%_50%/0.5)] hover:scale-[1.02] active:scale-[0.98]",
        hero: "bg-cyber-gradient text-primary-foreground font-bold text-lg px-8 py-4 hover:shadow-[0_0_50px_hsl(189_100%_50%/0.6)] hover:scale-[1.03] active:scale-[0.98]",
        "hero-ghost": "border-2 border-foreground/30 bg-transparent text-foreground font-semibold hover:bg-foreground/10 hover:border-primary/50 text-lg px-8 py-4",
        glass: "glass glass-hover font-medium",
        cyan: "bg-cyan text-primary-foreground hover:bg-cyan-glow hover:shadow-[0_0_30px_hsl(189_100%_50%/0.5)]",
        usdc: "bg-usdc text-primary-foreground hover:bg-usdc-glow hover:shadow-[0_0_30px_hsl(162_60%_40%/0.5)]",
        wallet: "glass border-primary/30 text-foreground font-medium hover:border-primary hover:shadow-[0_0_20px_hsl(189_100%_50%/0.3)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-6 text-base",
        xl: "h-14 rounded-2xl px-8 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
