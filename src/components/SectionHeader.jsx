import React from 'react';
import { Typography, Button } from './ui';

export default function SectionHeader({ title, btn, onBtn, action, onAction }) {
  const buttonText = btn || action;
  const buttonAction = onBtn || onAction;

  return (
    <div className="flex justify-between items-center mb-[18px]">
      <Typography variant="h2" size="lg" weight="bold" className="m-0 text-foreground">
        {title}
      </Typography>
      {buttonText && (
        <Button onClick={buttonAction} size="sm" className="flex items-center gap-1.5 font-semibold mt-1.5">
          + {buttonText}
        </Button>
      )}
    </div>
  );
}
