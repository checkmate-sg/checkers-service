import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

interface TruthScoreOptionsProps {
    selectedTruthScore: number | null;
    numberPointScale: number;
    onChange: (value: string) => void;
  }
  
interface InfoOptionsProps {
    selectedTruthScore: number | null;
    numberPointScale: number;
    handleTruthScoreChange: (value: string) => void;
}

// 1-5 Truth score radio buttons selection 
function TruthScoreOptions(props: TruthScoreOptionsProps) {
    const numberList = Array.from(
        { length: props.numberPointScale ?? 6},
        (_, index) => index + (props.numberPointScale === 5 ? 1 : 0)
    )

    return (
        <div className="w-full max-w-[24rem] border-0 p-0">
            <div>
                <RadioGroup
                    value={props.selectedTruthScore !== null ? String(props.selectedTruthScore) : ""}
                    onValueChange={props.onChange}
                    className="flex flex-row gap-4 justify-between border-0 p-0"
                >
                    {numberList.map((num) => (
                        <div 
                            key={num}
                            className="flex items-center justify-center gap-2"
                        >
                            <RadioGroupItem 
                                value={String(num)}
                                id = {`truth-score-${num}`} 
                                className="h-5 w-5"/>
                            
                            <Label htmlFor={`truth-score-${num}`}>
                                {num}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
        </div>
    )
}

export default function InfoOptions(props: InfoOptionsProps) {
    return (
        <div>
            <div className="text-primary text-justify my-3">
                Please assess the veracity of the claim(s) in the message on a scale from 0 (entirely false) to 5 (entirely true).
            </div>
            <TruthScoreOptions
                selectedTruthScore={props.selectedTruthScore}
                numberPointScale={props.numberPointScale}
                onChange={props.handleTruthScoreChange}
            />
        </div>
    )
}
  