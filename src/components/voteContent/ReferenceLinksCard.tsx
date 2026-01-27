import { LinkIcon } from "@heroicons/react/20/solid";

import { Card, CardContent } from "../ui/card";

interface ReferenceLinksCardProps {
  links: string[] | null;
}

export default function ReferenceLinksCard({ links }: ReferenceLinksCardProps) {
  if (!links || links.length === 0) return null;

  return (
    <Card className="bg-slate-100 p-3 mx-3 my-3">
      <CardContent className="-m-2">
        <div className="flex items-center my-3">
          <LinkIcon className="h-6 w-6 text-slate-600 mr-2 flex-shrink-0" />
          <p className="font-semibold text-slate-700 leading-none">Reference Links:</p>
        </div>
        <ul className="list-disc pt-1">
          {links.map(link => (
            <li className="flex gap-x-2" key={link}>
              <LinkIcon aria-hidden="true" className="h-6 w-5 flex-none text-slate-400" />
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
