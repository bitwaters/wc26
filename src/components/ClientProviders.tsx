'use client';

import React, { createContext, useContext, useState } from 'react';

interface BettorContextValue {
  bettorId: string;       // 'all' | player.id
  setBettorId: (id: string) => void;
}

const BettorContext = createContext<BettorContextValue>({
  bettorId: 'all',
  setBettorId: () => {},
});

export function useBettorFilter() {
  return useContext(BettorContext);
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [bettorId, setBettorId] = useState('all');

  return (
    <BettorContext.Provider value={{ bettorId, setBettorId }}>
      {children}
    </BettorContext.Provider>
  );
}
