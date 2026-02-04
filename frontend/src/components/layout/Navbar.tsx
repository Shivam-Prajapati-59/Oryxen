"use client";

import { navbarConfig } from '@/config/Navbar';
import { Link } from 'next-view-transitions';
import Container from '../common/Container';
import { ThemeToggleButton } from '../custom/ThemeToggle';
// import { MobileNav } from '../common/Mobile-Nav';
import Image from 'next/image';
import { useState } from 'react';
import ConnectWallet from '../common/ConnectWallet';

export default function Navbar() {
    const [searchOpen, setSearchOpen] = useState(false);

    const mobileNavItems = navbarConfig.navItems.map(item => ({
        title: item.label,
        href: item.href
    }));

    return (
        <>
            <Container className="sticky top-0 z-20 backdrop-blur-sm ">
                <div className="flex items-center justify-between py-4 px-6">
                    {/* Left Side - Logo + Nav Links */}
                    <div className="flex items-center md:gap-4 gap-8">
                        {/* Logo */}
                        <Link href="/" className="flex items-cente">
                            <Image
                                src={navbarConfig.logo.src}
                                alt={navbarConfig.logo.alt}
                                width={navbarConfig.logo.width}
                                height={navbarConfig.logo.height}
                                className='rounded-lg hover:opacity-80 transition-opacity'
                                priority
                            />
                        </Link>

                        {/* Desktop Navigation Links */}
                        <div className="hidden md:flex items-center gap-6">
                            {navbarConfig.navItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className="relative text-md font-medium
                                                transition-colors duration-300
                                                after:absolute after:left-0 after:-bottom-1
                                                after:h-0.5 after:w-0 after:bg-foreground
                                                after:transition-all after:duration-300
                                                hover:text-foreground hover:after:w-full"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right Side - Actions */}
                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <ThemeToggleButton />
                        <ConnectWallet />

                        {/* Mobile Navigation */}
                        <div className="md:hidden">
                            {/* <MobileNav items={mobileNavItems} /> */}
                        </div>
                    </div>
                </div>
            </Container>
        </>
    );
}