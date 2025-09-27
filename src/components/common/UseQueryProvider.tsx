'use client';
import { memo, useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const UseQueryProvider = memo((props: {children?:React.ReactElement}) => {
    const [queryClient] = useState(
        () => 
            new QueryClient()
    )

    return (
        <QueryClientProvider client={queryClient}>
            {props.children}
        </QueryClientProvider>
    )
})