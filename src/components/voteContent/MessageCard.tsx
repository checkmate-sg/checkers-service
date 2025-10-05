import normalizeUrl from 'normalize-url';
import urlRegexSafe from 'url-regex-safe';

interface MessageCardProps {
    text: string | null;
    caption: string | null;
    imageUrl: string | null; 
}
// Helper function to detect URLs and split the text 
const splitTextByUrls = (text: string) => {
    // This regex will match URLs
    const urlRegex = urlRegexSafe();
    let match;
    let lastIndex = 0;
    const parts = [];

    // Find all matches and their indices 
    while ((match = urlRegex.exec(text)) !== null) {
        const url = match[0];
        const index = match.index;

        // Push text before URL 
        if (index > lastIndex) {
            parts.push({text: text.substring(lastIndex, index), isUrl: false});
        }

        // Push URL
        parts.push({text: normalizeUrl(url, {defaultProtocol: "https", stripWWW:false}), isUrl: true})

        // Update lastIndex to end of current URL
        lastIndex = index + url.length;
    }
    // Push remaining text after last URL 
    if (lastIndex < text.length) {
        parts.push({ text: text.substring(lastIndex), isUrl: false});
    }

    return parts;
}

export default function MessageCard(props: MessageCardProps){
    return (
        <div>Message Card</div>
    )
}