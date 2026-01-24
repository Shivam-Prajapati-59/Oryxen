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
            className={`container mx-auto w-full px-2 md:px-4 lg:px-8" ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}