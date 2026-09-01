'use client';

/**
 * Marketplace Browse Page
 * @module roycss/marketplace/page
 * @description Main marketplace browsing page
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Star, 
  Download, 
  Eye,
  Filter,
  Grid3X3,
  List,
  Package,
  Sparkles,
  TrendingUp,
  Clock
} from 'lucide-react';

/** Mock marketplace items */
const MOCK_ITEMS = [
  {
    id: '1',
    name: 'Bounce Effect Pack',
    slug: 'bounce-effect-pack',
    description: 'Collection of 10 bouncing animations for buttons and elements',
    type: 'effect',
    author: { name: 'CSSMaster', username: 'cssmaster' },
    version: '1.2.0',
    license: 'MIT',
    tags: ['animation', 'bounce', 'button', 'playful'],
    downloads: 15234,
    rating: 4.8,
    reviewCount: 124,
    price: null,
    previewImage: '/api/placeholder/300/200',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-20')
  },
  {
    id: '2',
    name: 'Modern Card Component',
    slug: 'modern-card-component',
    description: 'Beautiful card component with hover effects and variants',
    type: 'component',
    author: { name: 'UI Designer', username: 'uidesigner' },
    version: '2.0.1',
    license: 'MIT',
    tags: ['card', 'component', 'hover', 'modern'],
    downloads: 8921,
    rating: 4.9,
    reviewCount: 89,
    price: null,
    previewImage: '/api/placeholder/300/200',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-04-01')
  },
  {
    id: '3',
    name: 'Dark Mode Theme',
    slug: 'dark-mode-theme',
    description: 'Complete dark mode theme with smooth transitions',
    type: 'theme',
    author: { name: 'ThemeKing', username: 'themeking' },
    version: '1.0.0',
    license: 'GPL-3.0',
    tags: ['dark', 'theme', 'colors', 'night'],
    downloads: 23456,
    rating: 4.7,
    reviewCount: 256,
    price: 9.99,
    previewImage: '/api/placeholder/300/200',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-04-15')
  }
];

/** Item card component */
function ItemCard({ item }: { item: typeof MOCK_ITEMS[0] }) {
  return (
    <Card className="group cursor-pointer hover:border-primary/50 transition-all">
      <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
        <Package className="w-12 h-12 text-muted-foreground" />
        
        {/* Price badge */}
        {item.price !== null && (
          <Badge className="absolute top-2 right-2">
            ${item.price}
          </Badge>
        )}
        {item.price === null && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            Free
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-base line-clamp-1">{item.name}</CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
          {item.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>by {item.author.name}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {item.rating}
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {(item.downloads / 1000).toFixed(1)}k
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">ROYCSS Marketplace</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover effects, components, themes, and more for your ROYCSS projects
        </p>
      </div>

      {/* Search bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search effects, components, themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-12 text-base"
          />
          <Button className="absolute right-2 top-1/2 -translate-y-1/2">Search</Button>
        </div>
      </div>

      {/* Categories tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="mx-auto w-fit">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="effects">Effects</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Featured section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Featured
          </h2>
          <Button variant="ghost" size="sm">View all →</Button>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {MOCK_ITEMS.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Popular & New sections */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Popular */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Popular
            </h2>
          </div>
          <div className="space-y-3">
            {MOCK_ITEMS.map(item => (
              <Card key={item.id} className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-16 h-12 bg-muted rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {item.rating}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(item.downloads / 1000).toFixed(1)}k downloads
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* New */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              New Arrivals
            </h2>
          </div>
          <div className="space-y-3">
            {[...MOCK_ITEMS].reverse().map(item => (
              <Card key={item.id} className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-16 h-12 bg-muted rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">by {item.author.name}</p>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* CTA */}
      <section className="mt-16 text-center">
        <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-12 px-8">
            <h2 className="text-2xl font-bold mb-4">Want to publish?</h2>
            <p className="text-muted-foreground mb-6">
              Share your effects, components, and themes with the ROYCSS community.
            </p>
            <Button size="lg">Start Publishing</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
