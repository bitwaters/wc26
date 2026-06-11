'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface FlagProps {
  teamName: string;
  className?: string;
  size?: number;
}

const TEAM_CODES: Record<string, string> = {
  'algeria': 'dz',
  'argentina': 'ar',
  'australia': 'au',
  'austria': 'at',
  'belgium': 'be',
  'bosnia and herzegovina': 'ba',
  'brazil': 'br',
  'canada': 'ca',
  'cape verde': 'cv',
  'colombia': 'co',
  'croatia': 'hr',
  'curacao': 'cw',
  'cura\u00e7ao': 'cw',
  'czechia': 'cz',
  'denmark': 'dk',
  'dr congo': 'cd',
  'ecuador': 'ec',
  'egypt': 'eg',
  'england': 'gb-eng',
  'france': 'fr',
  'germany': 'de',
  'ghana': 'gh',
  'haiti': 'ht',
  'iran': 'ir',
  'iraq': 'iq',
  'ivory coast': 'ci',
  'jamaica': 'jm',
  'japan': 'jp',
  'jordan': 'jo',
  'mexico': 'mx',
  'morocco': 'ma',
  'netherlands': 'nl',
  'new zealand': 'nz',
  'norway': 'no',
  'panama': 'pa',
  'paraguay': 'py',
  'portugal': 'pt',
  'qatar': 'qa',
  'saudi arabia': 'sa',
  'scotland': 'gb-sct',
  'senegal': 'sn',
  'slovakia': 'sk',
  'south africa': 'za',
  'sweden': 'se',
  'south korea': 'kr',
  'spain': 'es',
  'switzerland': 'ch',
  'tunisia': 'tn',
  'usa': 'us',
  'türkiye': 'tr',
  'turkey': 'tr',
  'ukraine': 'ua',
  'uruguay': 'uy',
  'uzbekistan': 'uz',
  'wales': 'gb-wls',
};

function isPlaceholderTeam(teamName: string): boolean {
  return (
    !teamName ||
    teamName.trim() === '' ||
    teamName.includes('Winner') ||
    teamName.includes('Runner-up') ||
    teamName.includes('3rd') ||
    teamName.includes('Loser')
  );
}

function PlaceholderBadge({ className, size }: { className: string; size: number }) {
  return (
    <div
      className={`inline-flex items-center justify-center bg-apple-secondary-bg text-[10px] font-semibold text-apple-secondary-fg rounded-[4px] border border-apple-border/40 ${className}`}
      style={{ width: `${size * 1.5}px`, height: `${size}px` }}
    >
      TBD
    </div>
  );
}

export default function Flag({ teamName, className = '', size = 20 }: FlagProps) {
  const [imageError, setImageError] = useState(false);

  if (isPlaceholderTeam(teamName) || imageError) {
    return <PlaceholderBadge className={className} size={size} />;
  }

  const key = teamName.toLowerCase().trim();
  const code = TEAM_CODES[key];

  if (!code) {
    return <PlaceholderBadge className={className} size={size} />;
  }

  const src = `https://flagcdn.com/${code}.svg`;

  return (
    <div
      className={`relative inline-block overflow-hidden rounded-[3px] border border-apple-border/30 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${className}`}
      style={{ width: `${size * 1.5}px`, height: `${size}px` }}
    >
      <Image
        src={src}
        alt={`${teamName} flag`}
        fill
        className="object-cover"
        sizes={`${size * 1.5}px`}
        unoptimized
        onError={() => setImageError(true)}
      />
    </div>
  );
}
