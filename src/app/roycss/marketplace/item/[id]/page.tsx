'use client';

/**
 * Marketplace Item Detail Page
 * @module roycss/marketplace/item/[id]/page
 * @description Individual marketplace item page
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  Download, 
  Eye, 
  Heart,
  Share2,
  ExternalLink,
  Github,
  BookOpen,
  Package,
  Shield,
  Users
} from 'lucide-react';

/** Mock item data */
const MOCK_ITEM = {
  id: '1',
  name: 'Bounce Effect Pack',
  slug: 'bounce-effect-pack',
  description: 'Collection of 10 professional bouncing animations perfect for buttons, cards, and interactive elements.',
  longDescription: `## About This Pack

The Bounce Effect Pack is a comprehensive collection of carefully crafted CSS animations that bring life to your web interfaces.

### What's Included

- **10 Unique Animations**: From subtle bounces to dramatic elastic effects
- **Easy Integration**: Just copy-paste or use with ROYCSS CLI
- **Performance Optimized**: Uses GPU-accelerated properties only
- **Accessibility Ready**: Respects \`prefers-reduced-motion\`
- **Well Documented**: Each effect includes usage examples

### Effects List

1. **Classic Bounce** - The timeless bounce animation
2. **Elastic Pop** - Overshoots and settles
3. **Gentle Bob** - Subtle up-down motion
4. **Excited Jump** - High energy bounce
5. **Soft Landing** - Smooth deceleration
6. **Rubber Ball** - Squash and stretch
7. **Heartbeat** - Pulsing rhythm
8. **Jelly Wobble** - Fun wobble effect
9. **Spring Back** - Physics-based return
10. **Neon Pulse** - Glowing bounce

### Browser Support

Works in all modern browsers including Chrome, Firefox, Safari, and Edge.`,
  type: 'effect',
  author: {
    id: 'author-1',
    name: 'CSS Master',
    username: 'cssmaster',
    avatar: null,
    bio: 'CSS enthusiast and animation expert'
  },
  version: '1.2.0',
  license: 'MIT',
  tags: ['animation', 'bounce', 'button', 'interactive', 'css'],
  categories: ['animation', 'interaction'],
  screenshots: [],
  downloads: 15234,
  views: 45678,
  rating: 4.8,
  reviewCount: 124,
  price: null,
  currency: 'USD',
  visibility: 'public',
  compatibility: {
    browsers: {
      chrome: true,
      firefox: true,
      safari: true,
      edge: true,
      mobile: true
    },
    frameworks: ['vanilla', 'react', 'vue', 'angular']
  },
  demoUrl: '#',
  docsUrl: '#',
  repositoryUrl: '#',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-03-20'),
  publishedAt: new Date('2024-01-15')
};

/** Mock reviews */
const MOCK_REVIEWS = [
  {
    id: 'r1',
    itemId: '1',
    userId: 'u1',
    userName: 'John D.',
    userAvatar: null,
    rating: 5,
    title: 'Excellent animations!',
    content: 'These bounces are smooth and performant. Used them on my portfolio site and got great feedback!',
    createdAt: new Date('2024-02-20'),
    helpful: 24,
    verified: true
  },
  {
    id: 'r2',
    itemId: '1',
    userId: 'u2',
    userName: 'Sarah M.',
    userAvatar: null,
    rating: 4,
    title: 'Great variety',
    content: 'Lots of different bounce styles to choose from. Documentation could be a bit more detailed.',
    createdAt: new Date('2024-03-05'),
    helpful: 12,
    verified: true
  }
];

export default function MarketItemPage() {
  const params = useParams();
  const itemId = params.id as string;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="capitalize">{MOCK_ITEM.type}</Badge>
                  <Badge variant="secondary">v{MOCK_ITEM.version}</Badge>
                  <Badge>{MOCK_ITEM.license}</Badge>
                </div>
                <h1 className="text-3xl font-bold">{MOCK_ITEM.name}</h1>
                <p className="text-lg text-muted-foreground mt-2">{MOCK_ITEM.description}</p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="ghost" size="icon"><Heart className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon"><Share2 className="w-5 h-5" /></Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <strong className="text-foreground">{MOCK_ITEM.rating}</strong>
                ({MOCK_ITEM.reviewCount})
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                {MOCK_ITEM.downloads.toLocaleString()} downloads
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {MOCK_ITEM.views.toLocaleString()} views
              </span>
            </div>
          </div>

          {/* Preview */}
          <Card>
            <CardContent className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Preview would be shown here</p>
              </div>
            </CardContent>
          </Card>

          {/* Details tabs */}
          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({MOCK_ITEM.reviewCount})</TabsTrigger>
              <TabsTrigger value="changelog">Changelog</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-4">
              <div className="prose prose-sm max-w-none">
                {MOCK_ITEM.longDescription.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-xl font-semibold mt-6 mb-3">{line.replace('## ', '')}</h2>;
                  }
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                  }
                  if (line.startsWith('- **')) {
                    return <li key={i}><strong>{line.match(/\*\*(.*?)\*\*/)?.[1]}</strong>: {line.split(':').slice(1).join(':')}</li>;
                  }
                  if (line.startsWith('- ')) {
                    return <li key={i}>{line.replace('- ', '')}</li>;
                  }
                  if (line.trim() === '') return <br key={i} />;
                  return <p key={i}>{line}</p>;
                })}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-4 space-y-4">
              {MOCK_REVIEWS.map(review => (
                <Card key={review.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {review.userName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{review.userName}</p>
                          {review.verified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {review.title && <h4 className="font-medium mb-1">{review.title}</h4>}
                    <p className="text-sm text-muted-foreground">{review.content}</p>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                      <button className="hover:text-foreground">Helpful ({review.helpful})</button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="changelog" className="mt-4">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <Badge className="mb-2">v1.2.0</Badge>
                    <p className="text-sm">Added 2 new animations, improved documentation</p>
                  </div>
                  <Separator />
                  <div>
                    <Badge variant="secondary" className="mb-2">v1.1.0</Badge>
                    <p className="text-sm">Fixed Safari compatibility issues</p>
                  </div>
                  <Separator />
                  <div>
                    <Badge variant="secondary" className="mb-2">v1.0.0</Badge>
                    <p className="text-sm">Initial release with 8 animations</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Download/Purchase card */}
          <Card>
            <CardContent className="pt-6">
              {MOCK_ITEM.price === null ? (
                <>
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-green-600">Free</p>
                    <p className="text-sm text-muted-foreground">Open Source (MIT)</p>
                  </div>
                  <Button className="w-full" size="lg">
                    <Download className="w-4 h-4 mr-2" />
                    Download Now
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold">${MOCK_ITEM.price}</p>
                    <p className="text-sm text-muted-foreground">One-time purchase</p>
                  </div>
                  <Button className="w-full" size="lg">
                    <Download className="w-4 h-4 mr-2" />
                    Buy Now
                  </Button>
                </>
              )}

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <ExternalLink className="w-4 h-4" /> Live Demo
                </a>
                <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <BookOpen className="w-4 h-4" /> Documentation
                </a>
                <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Github className="w-4 h-4" /> Repository
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Author card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Author</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">
                  {MOCK_ITEM.author.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{MOCK_ITEM.author.name}</p>
                  <p className="text-sm text-muted-foreground">@{MOCK_ITEM.author.username}</p>
                </div>
              </div>
              {MOCK_ITEM.author.bio && (
                <p className="text-sm text-muted-foreground mt-3">{MOCK_ITEM.author.bio}</p>
              )}
              <Button variant="outline" className="w-full mt-4" size="sm">
                Follow
              </Button>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {MOCK_ITEM.tags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compatibility */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" /> Compatibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Browsers:</strong> Chrome, Firefox, Safari, Edge</p>
                <p><strong>Frameworks:</strong> Vanilla, React, Vue, Angular</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
