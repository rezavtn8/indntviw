import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROPERTY_CONFIGS, PropertyConfig } from '@/types/indentation';

interface PropertySelectorProps {
  availableProperties: string[];
  selectedProperty: string;
  onPropertyChange: (property: string) => void;
}

export const PropertySelector: React.FC<PropertySelectorProps> = ({
  availableProperties,
  selectedProperty,
  onPropertyChange,
}) => {
  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  // Filter to only show properties that exist in the data
  const filteredProperties = PROPERTY_CONFIGS.filter(
    config => availableProperties.includes(config.key)
  );

  // Add any properties not in PROPERTY_CONFIGS
  const additionalProperties = availableProperties.filter(
    prop => !PROPERTY_CONFIGS.some(config => config.key === prop)
  );

  return (
    <div className="space-y-2">
      <label className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
        Property
      </label>
      <Select value={selectedProperty} onValueChange={onPropertyChange}>
        <SelectTrigger className="w-full font-mono text-sm">
          <SelectValue placeholder="Select property" />
        </SelectTrigger>
        <SelectContent>
          {filteredProperties.map((config) => (
            <SelectItem key={config.key} value={config.key} className="font-mono text-sm">
              {config.label}
            </SelectItem>
          ))}
          {additionalProperties.map((prop) => (
            <SelectItem key={prop} value={prop} className="font-mono text-sm">
              {prop}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
