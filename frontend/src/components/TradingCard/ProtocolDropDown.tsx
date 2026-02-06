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

const protocols = ["All", "Drift", "Jup Perps", "Flash"];

const ProtocolDropDown = ({ selectedProtocol, onProtocolChange }: ProtocolDropDownProps) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    {selectedProtocol}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
                {protocols.map((protocol) => (
                    <DropdownMenuItem
                        key={protocol}
                        onClick={() => onProtocolChange(protocol)}
                        className={selectedProtocol === protocol ? "bg-accent" : ""}
                    >
                        {protocol}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default ProtocolDropDown