import React from 'react';

export default function Container({
    children,
    className,
    ...props
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`container mx-auto w-full px-3 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}