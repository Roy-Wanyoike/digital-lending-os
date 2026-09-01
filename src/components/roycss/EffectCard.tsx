'use client';

/**
 * ROYCSS Effect Card Component
 * 
 * Displays a single effect as a card with preview and metadata.
 * 
 * @module roycss/components/EffectCard
 */

import React from 'react';
import { RoyCSSEffect, CATEGORY_METADATA } from '@/lib/roycss/effects/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface EffectCardProps {
  effect: RoyCSSEffect;
  onClick?: (effect: RoyCSSEffect) => void;
  showPreview?: boolean;
  compact?: boolean;
}

export const EffectCard: React.FC<EffectCardProps> = ({
  effect,
  onClick,
  showPreview = true,
  compact = false,
}) => {
  const categoryMeta = CATEGORY_METADATA[effect.category];
  
  return (
    <Card
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
      onClick={() => onClick?.(effect)}
    >
      <CardContent className={`p-4 ${compact ? 'p-3' : ''}`}>
        {/* Preview Area */}
        {showPreview && (
          <div className="mb-3 rounded-lg bg-muted/50 p-4 flex items-center justify-center min-h-[100px] overflow-hidden">
            <EffectMiniPreview effect={effect} />
          </div>
        )}
        
        {/* Effect Info */}
        <div className="space-y-2">
          {/* Name & Category */}
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold text-foreground line-clamp-1 ${compact ? 'text-sm' : ''}`}>
              {effect.name}
            </h3>
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] px-1.5 py-0"
              style={{ backgroundColor: `${categoryMeta?.color}20`, color: categoryMeta?.color }}
            >
              {effect.category}
            </Badge>
          </div>
          
          {/* Description */}
          {!compact && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {effect.description}
            </p>
          )}
          
          {/* Meta Info */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {effect.difficulty}
            </Badge>
            {effect.customizable && (
              <Badge variant="outline" className="text-xs" style={{ borderColor: '#10b981', color: '#10b981' }}>
                Customizable
              </Badge>
            )}
            {effect.tailwind && (
              <Badge variant="outline" className="text-xs" style={{ borderColor: '#06b6d4', color: '#06b6d4' }}>
                Tailwind
              </Badge>
            )}
          </div>
          
          {/* Tags */}
          {!compact && effect.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap pt-1">
              {effect.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {effect.tags.length > 4 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  +{effect.tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Mini Preview Component
const EffectMiniPreview: React.FC<{ effect: RoyCSSEffect }> = ({ effect }) => {
  // Generate appropriate preview content based on category
  const renderPreviewContent = () => {
    switch (effect.category) {
      case 'text':
        return (
          <span
            dangerouslySetInnerHTML={{ __html: generateInlineStyle(effect) }}
            className={effect.id}
          >
            Aa
          </span>
        );
      case 'animation':
        if (effect.subCategory === 'loading') {
          return <div className={`${effect.id} w-8 h-8`} />;
        }
        return <div className={`${effect.id} w-12 h-12 rounded-md bg-primary/20`} />;
      case 'visual':
        return <div className={`${effect.id} w-16 h-16 rounded-lg`} />;
      case 'layout':
        if (effect.subCategory === 'card') {
          return (
            <div className={`${effect.id} w-24 space-y-2`}>
              <div className="w-full h-12 rounded bg-muted" />
              <div className="h-2 w-3/4 rounded bg-muted" />
              <div className="h-2 w-1/2 rounded bg-muted" />
            </div>
          );
        }
        return (
          <div className={`${effect.id} grid grid-cols-2 gap-1`}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-6 h-6 rounded-sm bg-muted/70" />
            ))}
          </div>
        );
      case 'interactive':
      case 'transition':
        return (
          <button className={`${effect.id} px-3 py-1.5 text-xs rounded-md border`}>
            Hover
          </button>
        );
      default:
        return <div className={`${effect.id} p-2 rounded bg-muted/50`} />;
    }
  };

  return (
    <>
      <style>{effect.css}</style>
      {renderPreviewContent()}
    </>
  );
};

// Generate inline style tag for preview
function generateInlineStyle(effect: RoyCSSEffect): string {
  return `<style>${effect.css}</style>`;
}

export default EffectCard;
