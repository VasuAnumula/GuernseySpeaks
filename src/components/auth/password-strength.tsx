"use client";

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
    password: string;
    className?: string;
}

interface StrengthResult {
    score: number;
    label: string;
    color: string;
    bgColor: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
    const strength = useMemo((): StrengthResult => {
        if (!password) {
            return { score: 0, label: '', color: '', bgColor: '' };
        }

        let score = 0;

        // Length check
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;

        // Character variety checks
        if (/[a-z]/.test(password)) score += 1; // lowercase
        if (/[A-Z]/.test(password)) score += 1; // uppercase
        if (/[0-9]/.test(password)) score += 1; // numbers
        if (/[^a-zA-Z0-9]/.test(password)) score += 1; // special characters

        // Determine strength level
        if (score <= 2) {
            return {
                score: 33,
                label: 'Weak',
                color: 'text-red-600',
                bgColor: 'bg-red-500'
            };
        } else if (score <= 4) {
            return {
                score: 66,
                label: 'Medium',
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-500'
            };
        } else {
            return {
                score: 100,
                label: 'Strong',
                color: 'text-green-600',
                bgColor: 'bg-green-500'
            };
        }
    }, [password]);

    if (!password) return null;

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Password strength:</span>
                <span className={cn("text-xs font-medium transition-colors duration-300", strength.color)}>
                    {strength.label}
                </span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full transition-all duration-300 ease-out rounded-full",
                        strength.bgColor
                    )}
                    style={{ width: `${strength.score}%` }}
                />
            </div>
            <p className="text-xs text-muted-foreground">
                Use 8+ characters with a mix of letters, numbers & symbols
            </p>
        </div>
    );
}
