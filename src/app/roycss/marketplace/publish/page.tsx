'use client';

/**
 * Publish Page
 * @module roycss/marketplace/publish/page
 * @description Publish new marketplace items
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  X, 
  Plus,
  AlertCircle,
  CheckCircle,
  Package,
  Sparkles
} from 'lucide-react';
import { ITEM_TYPES, CATEGORIES, LICENSES } from '@/lib/roycss/marketplace/constants';

/** Form state interface */
interface FormData {
  name: string;
  description: string;
  longDescription: string;
  type: string;
  license: string;
  tags: string[];
  category: string;
  priceType: 'free' | 'paid';
  price: number;
  demoUrl: string;
  docsUrl: string;
  repositoryUrl: string;
}

export default function PublishPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    longDescription: '',
    type: '',
    license: 'MIT',
    tags: [],
    category: '',
    priceType: 'free',
    price: 0,
    demoUrl: '',
    docsUrl: '',
    repositoryUrl: ''
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  /** Update form field */
  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /** Add tag */
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && !formData.tags.includes(tag)) {
      updateField('tags', [...formData.tags, tag]);
    }
    setTagInput('');
  };

  /** Remove tag */
  const removeTag = (tag: string) => {
    updateField('tags', formData.tags.filter(t => t !== tag));
  };

  /** Validate form */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.type) newErrors.type = 'Please select an item type';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (formData.tags.length === 0) newErrors.tags = 'Add at least one tag';
    if (formData.priceType === 'paid' && formData.price <= 0) newErrors.price = 'Enter a valid price';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Submit form */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setIsSuccess(true);
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Submitted for Review!</h2>
            <p className="text-muted-foreground mb-6">
              Your item has been submitted and will be reviewed by our team within 48 hours.
            </p>
            <Button onClick={() => setIsSuccess(false)}>
              Publish Another Item
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Publish to Marketplace
        </h1>
        <p className="text-muted-foreground mt-2">
          Share your effects, components, themes, or plugins with the ROYCSS community
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell us about your item</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="My Awesome Effect"
                  className="mt-1"
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Short Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="A brief description of your item (max 500 characters)"
                  rows={3}
                  className="mt-1"
                />
                {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
              </div>

              {/* Long Description */}
              <div>
                <Label htmlFor="longDescription">Full Description</Label>
                <Textarea
                  id="longDescription"
                  value={formData.longDescription}
                  onChange={(e) => updateField('longDescription', e.target.value)}
                  placeholder="Detailed description, features, usage instructions... (supports Markdown)"
                  rows={6}
                  className="mt-1"
                />
              </div>

              {/* Type & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type *</Label>
                  <Select value={formData.type} onValueChange={(v) => updateField('type', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ITEM_TYPES).map(([key, value]) => (
                        <SelectItem key={key} value={value}>
                          {value.charAt(0).toUpperCase() + value.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-sm text-destructive mt-1">{errors.type}</p>}
                </div>

                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => updateField('category', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES[formData.type as keyof typeof CATEGORIES]?.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      )) || <SelectItem value="">Select type first</SelectItem>}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-destructive mt-1">{errors.category}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags & Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Tags & Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tags */}
              <div>
                <Label>Tags *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag and press Enter"
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {errors.tags && <p className="text-sm text-destructive mt-1">{errors.tags}</p>}
                
                {/* Tag badges */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* License */}
              <div>
                <Label>License *</Label>
                <Select value={formData.license} onValueChange={(v) => updateField('license', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSES.map(license => (
                      <SelectItem key={license.value} value={license.value}>{license.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Pricing */}
              <div>
                <Label>Pricing</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.priceType === 'free'}
                      onChange={() => updateField('priceType', 'free')}
                    />
                    Free / Open Source
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.priceType === 'paid'}
                      onChange={() => updateField('priceType', 'paid')}
                    />
                    Paid
                  </label>
                </div>

                {formData.priceType === 'paid' && (
                  <div className="mt-3">
                    <Label htmlFor="price">Price (USD)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price || ''}
                        onChange={(e) => updateField('price', Number(e.target.value))}
                        className="pl-7"
                        placeholder="9.99"
                      />
                    </div>
                    {errors.price && <p className="text-sm text-destructive mt-1">{errors.price}</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* URLs */}
          <Card>
            <CardHeader>
              <CardTitle>Links (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="demoUrl">Demo URL</Label>
                <Input
                  id="demoUrl"
                  value={formData.demoUrl}
                  onChange={(e) => updateField('demoUrl', e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="docsUrl">Documentation URL</Label>
                <Input
                  id="docsUrl"
                  value={formData.docsUrl}
                  onChange={(e) => updateField('docsUrl', e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="repositoryUrl">Repository URL</Label>
                <Input
                  id="repositoryUrl"
                  value={formData.repositoryUrl}
                  onChange={(e) => updateField('repositoryUrl', e.target.value)}
                  placeholder="https://github.com/..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Files Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
              <CardDescription>Upload your source files and screenshots</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium mb-1">Drag & drop files here</p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <Button variant="outline">Choose Files</Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Accepted: .zip, .css, .js, .html, images (max 10MB)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline">Save as Draft</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
