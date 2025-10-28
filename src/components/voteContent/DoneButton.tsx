import { CheckCircleIcon } from 'lucide-react';

import { Button } from '../ui/button';

interface DoneButtonProps {
    voteRequestId: string | null; 
    voteCategory: string | null;
    truthScore: number | null;
    crowdSourcedCategory: string | null;
}
export default function DoneButton(Prop: DoneButtonProps) {
    return (
        <Button
            variant="doneButton"
            className="my-5 flex items-center justify-center gap-3 w-full"
            size="sm"
        >
            <CheckCircleIcon className="h-5 w-5"/>
            Done! 
        </Button>
    )

}