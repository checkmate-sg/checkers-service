import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

interface NvcOptionsProps {
    selectedNVCCategory: string | null;
    onChange: (value: string) => void;
}

export default function NvcOptions(props: NvcOptionsProps) {
    const optionList = [
        {
            category: "legitimate",
            display: "Yes",
        },
        {
            category: "irrelevant",
            display: "Cannot Tell"
        }
    ];

    return (
        <div className="w-full max-w-[24rem] border-0 p-0">
            <div className="text-primary text-justify my-3">
                Is the source a credible/reputable entity? 
            </div>
            <div>
            <RadioGroup
                value={props.selectedNVCCategory !== null ? props.selectedNVCCategory : ""}
                onValueChange={props.onChange}
                className="flex flex-row gap-4 justify-start border-0 p-0"
            >
                {optionList.map((option) => (
                    <div
                        key={option.category}
                        className="flex items-center justify-center gap-2">
                            <RadioGroupItem
                                value={option.category}
                                id={`nvc-option-${option.category}`}
                                className="h-6 w-6"/>
                                
                            <Label htmlFor={`nvc-option-${option.category}`}>
                                {option.display}
                            </Label>
                    </div>
                ))}
            </RadioGroup>
            </div>
        </div>

    )
}