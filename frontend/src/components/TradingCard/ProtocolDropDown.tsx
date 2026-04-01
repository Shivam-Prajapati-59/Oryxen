import React from 'react'
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from 'lucide-react'

interface ProtocolDropDownProps {
    selectedProtocol: string;
    onProtocolChange: (protocol: string) => void;
}

const protocols = [
    { name: "Drift", icon: "/assets/protocols/drift.png" },
    { name: "GMXSol", icon: "/assets/protocols/gmxsol.svg" }
];

const ProtocolDropDown = ({ selectedProtocol, onProtocolChange }: ProtocolDropDownProps) => {
    const selectedIcon = protocols.find(p => p.name === selectedProtocol)?.icon;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                        {selectedIcon && (
                            <img src={selectedIcon} alt={selectedProtocol} className="w-5 h-5 rounded-full object-cover bg-white" />
                        )}
                        <span className="font-medium">{selectedProtocol}</span>
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
                {protocols.map((protocol) => (
                    <DropdownMenuItem
                        key={protocol.name}
                        onClick={() => onProtocolChange(protocol.name)}
                        className={`flex items-center gap-2 cursor-pointer ${selectedProtocol === protocol.name ? "bg-accent" : ""}`}
                    >
                        <img src={protocol.icon} alt={protocol.name} className="w-6 h-6 rounded-full object-cover bg-white" />
                        <span className="font-medium">{protocol.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default ProtocolDropDown