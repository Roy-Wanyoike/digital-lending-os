'use client';

/**
 * Components Page Client
 * 
 * Browse and preview 40+ ROYCSS UI components.
 */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import { PageHeader } from '@/components/roycss/navigation/BreadcrumbNav';
import {
  registry,
  getComponentsByCategory,
  searchComponents,
  getCategories,
} from '@/lib/roycss/components/registry';
import type { RoyCSSComponent, ComponentCategory } from '@/lib/roycss/components/types';

// Icons
import {
  Search,
  Grid3X3,
  List,
  Eye,
  Code,
  Copy,
  Check,
  X,
  FileText,
  Table,
  MessageSquare,
  Layers,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Keyboard,
  EyeOff,
  Sparkles,
  Package,
} from 'lucide-react';

// Category icons
const categoryIcons: Record<ComponentCategory, React.ReactNode> = {
  form: <FileText className="w-4 h-4" />,
  'data-display': <Table className="w-4 h-4" />,
  feedback: <MessageSquare className="w-4 h-4" />,
  overlay: <Layers className="w-4 h-4" />,
  navigation: <ChevronRight className="w-4 h-4" />,
  layout: <Grid3X3 className="w-4 h-4" />,
};

// Category colors
const categoryColors: Record<ComponentCategory, string> = {
  form: 'bg-blue-500/10 text-blue-600 border-blue-200',
  'data-display': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  feedback: 'bg-amber-500/10 text-amber-600 border-amber-200',
  overlay: 'bg-purple-500/10 text-purple-600 border-purple-200',
  navigation: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  layout: 'bg-pink-500/10 text-pink-600 border-pink-200',
};

// ============================================================================
// Component Preview Modal
// ============================================================================

interface ComponentPreviewProps {
  component: RoyCSSComponent | null;
  open: boolean;
  onClose: () => void;
}

function ComponentPreview({ component, open, onClose }: ComponentPreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'props'>('preview');
  const [copied, setCopied] = useState(false);

  if (!component) return null;

  const importCode = `import { ${component.displayName.replace(/\s/g, '')} } from '${component.importPath}';`;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate a simple usage example
  const generateExampleCode = (): string => {
    switch (component.name) {
      case 'text-input':
        return `<TextInput
  label="Email"
  value={email}
  onChange={setEmail}
  type="email"
  placeholder="Enter your email"
  error={error}
  required
/>`;
      case 'text-area':
        return `<TextArea
  label="Description"
  value={desc}
  onChange={setDesc}
  placeholder="Enter description"
  rows={4}
  showCount
  maxLength={500}
/>`;
      case 'select-input':
        return `<SelectInput
  label="Country"
  value={country}
  onChange={setCountry}
  options={[
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
  ]}
  searchable
/>`;
      case 'checkbox-group':
        return `<CheckboxGroup
  label="Interests"
  value={interests}
  onChange={setInterests}
  options={[
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
  ]}
  variant="card"
/>`;
      case 'radio-group':
        return `<RadioGroup
  label="Plan"
  value={plan}
  onChange={setPlan}
  options={[
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
  ]}
/>`;
      case 'toggle-switch':
        return `<ToggleSwitch
  label="Notifications"
  checked={enabled}
  onChange={setEnabled}
  description="Receive push notifications"
/>`;
      case 'search-input':
        return `<SearchInput
  value={query}
  onChange={setQuery}
  onSearch={handleSearch}
  placeholder="Search..."
  debounceMs={300}
/>`;
      case 'data-table':
        return `<DataTable
  data={users}
  columns={columns}
  rowKey={(row) => row.id}
  sortable
  filterable
  paginated
  pageSize={10}
/>`;
      case 'stat-card':
        return `<StatCard
  title="Total Revenue"
  value="$45,231"
  change={12.5}
  trend="up"
  changeLabel="from last month"
  icon={<DollarSign />}
/>`;
      case 'avatar':
        return `<Avatar
  src="/avatar.jpg"
  fallback="John Doe"
  size="md"
  status="online"
/>`;
      case 'badge':
        return `<Badge variant="success" dot>
  Active
</Badge>`;
      case 'pagination':
        return `<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
  showTotal
/>`;
      case 'alert-banner':
        return `<AlertBanner
  variant="success"
  title="Success!"
  Changes saved successfully.
  dismissible
/>`;
      case 'toast':
        return `const { success, error } = useToastActions();

success('Operation completed!');
error('Something went wrong!');`;
      case 'loading-spinner':
        return `<LoadingSpinner
  size="lg"
  centered
  text="Loading data..."
/>`;
      case 'modal':
        return `<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Confirm Action"
  size="md">
  <p>Are you sure you want to proceed?</p>
</Modal>`;
      case 'drawer':
        return `<Drawer
  open={open}
  onClose={() => setOpen(false)}
  position="right"
  title="Settings">
  {/* Settings content */}
</Drawer>`;
      case 'sheet':
        return `<Sheet
  open={open}
  onClose={() => setOpen(false)}
  side="right"
  title="Navigation">
  {/* Navigation content */}
</Sheet>`;
      default:
        return `<${component.displayName.replace(/\s/g, '')}>
  {/* Component props */}
</${component.displayName.replace(/\s/g, '')}>`;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg border',
              categoryColors[component.category]
            )}>
              {categoryIcons[component.category]}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">{component.displayName}</SheetTitle>
              <SheetDescription className="mt-1">{component.description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 p-1 bg-muted rounded-lg">
          {(['preview', 'code', 'props'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors capitalize',
                activeTab === tab
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'preview' && <Eye className="w-4 h-4 mr-2 inline" />}
              {tab === 'code' && <Code className="w-4 h-4 mr-2 inline" />}
              {tab === 'props' && <Package className="w-4 h-4 mr-2 inline" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* Live Preview */}
              <div className="p-6 rounded-lg border bg-card">
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Preview</h4>
                <LivePreview componentName={component.name} />
              </div>

              {/* Variants */}
              {component.variants.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Variants</h4>
                  <div className="flex flex-wrap gap-2">
                    {component.variants.map((variant) => (
                      <Badge key={variant} variant="outline">{variant}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Accessibility Features */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Keyboard className="w-4 h-4" />
                  Accessibility Features
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {component.a11yFeatures.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-success" />
                      <span className="capitalize">{feature.replace(/-/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4">
              {/* Import Statement */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Import</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(importCode)}
                    className="h-8"
                  >
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto text-sm">
                  <code>{importCode}</code>
                </pre>
              </div>

              {/* Usage Example */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Usage Example</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(generateExampleCode())}
                    className="h-8"
                  >
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto text-sm">
                  <code>{generateExampleCode()}</code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'props' && (
            <div className="space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Prop</th>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 text-left font-medium">Default</th>
                      <th className="px-4 py-3 text-left font-medium">Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {component.props.map((prop) => (
                      <tr key={prop.name}>
                        <td className="px-4 py-3 font-mono text-primary">{prop.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{prop.type}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {prop.defaultValue || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {prop.required ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5">Required</Badge>
                          ) : (
                            <span className="text-muted-foreground">Optional</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Live Preview Component
// ============================================================================

interface LivePreviewProps {
  componentName: string;
}

function LivePreview({ componentName }: LivePreviewProps) {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  switch (componentName) {
    case 'text-input':
      return (
        <div className="max-w-md space-y-4">
          <TextInputDemo />
        </div>
      );
    case 'toggle-switch':
      return (
        <div className="space-y-4">
          <ToggleSwitchDemo />
        </div>
      );
    case 'badge':
      return (
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success" dot>Active</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="destructive">Error</Badge>
        </div>
      );
    case 'stat-card':
      return (
        <div className="max-w-xs">
          <StatCardDemo />
        </div>
      );
    case 'avatar':
      return (
        <div className="flex items-center gap-4">
          <AvatarDemo />
        </div>
      );
    case 'alert-banner':
      return (
        <div className="space-y-3 max-w-md">
          <div className="border rounded-lg p-3 bg-success/10 text-success border-success/30">
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Success!</p>
                <p className="text-sm opacity-90">Your changes have been saved.</p>
              </div>
            </div>
          </div>
          <div className="border rounded-lg p-3 bg-destructive/10 text-destructive border-destructive/30">
            <div className="flex items-start gap-2">
              <X className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Error!</p>
                <p className="text-sm opacity-90">Something went wrong.</p>
              </div>
            </div>
          </div>
        </div>
      );
    case 'progress-bars':
      return (
        <div className="space-y-4 max-w-md">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>75%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full w-[75%] bg-primary rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Loading</span>
              <span>45%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full w-[45%] bg-success rounded-full" />
            </div>
          </div>
        </div>
      );
    case 'loading-spinner':
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      );
    case 'pagination':
      return (
        <div className="flex justify-center">
          <div className="flex items-center gap-1">
            <button className="h-9 w-9 rounded-md border hover:bg-accent disabled:opacity-50" disabled><ChevronRight className="w-4 h-4 mx-auto rotate-180" /></button>
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} className={cn('h-9 w-9 rounded-md text-sm font-medium', i === 2 ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                {i}
              </button>
            ))}
            <button className="h-9 w-9 rounded-md border hover:bg-accent"><ChevronRight className="w-4 h-4 mx-auto" /></button>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center space-y-2">
            <EyeOff className="w-12 h-12 mx-auto opacity-30" />
            <p>Interactive preview not available for this component.</p>
            <p className="text-sm">Check the Code tab for usage examples.</p>
          </div>
        </div>
      );
  }
}

// Demo components for previews
function TextInputDemo() {
  const [value, setValue] = useState('');
  return (
    <>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">With Error</label>
        <input
          type="text"
          defaultValue="invalid"
          className="w-full px-3 py-2 border border-red-500 rounded-md text-sm focus:ring-2 focus:ring-red-500 outline-none"
        />
        <p className="text-red-500 text-sm">This field is required</p>
      </div>
    </>
  );
}

function ToggleSwitchDemo() {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <p className="font-medium text-sm">Enable notifications</p>
        <p className="text-xs text-muted-foreground">Receive push notifications</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          enabled ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

function StatCardDemo() {
  return (
    <div className="p-6 rounded-lg border">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
          <p className="text-2xl font-bold">$45,231</p>
          <div className="flex items-center gap-1 text-sm text-success">
            <span>↑ 12.5%</span>
            <span className="text-muted-foreground">from last month</span>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function AvatarDemo() {
  return (
    <div className="flex -space-x-2">
      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium ring-2 ring-background">JD</div>
      <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium ring-2 ring-background">AS</div>
      <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-medium ring-2 ring-background">MK</div>
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium ring-2 ring-background">+3</div>
    </div>
  );
}

// ============================================================================
// Main Components Page
// ============================================================================

export function ComponentsPageClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'All'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedComponent, setSelectedComponent] = useState<RoyCSSComponent | null>(null);

  const categories = getCategories();

  const filteredComponents = useMemo(() => {
    let result = searchQuery
      ? searchComponents(searchQuery)
      : registry.components;

    if (selectedCategory !== 'All') {
      result = result.filter((c) => c.category === selectedCategory);
    }

    return result;
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageHeader
        title="UI Components"
        description={`${registry.total} production-ready UI components built with accessibility in mind. Browse, preview, and copy code for any component.`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'ROYCSS', href: '/roycss' },
          { label: 'Components', href: '/roycss/components' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search components by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setSelectedCategory('All')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium',
              selectedCategory === 'All'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border/50 hover:border-border text-muted-foreground'
            )}
          >
            <Layers className="w-4 h-4" />
            All
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
              {registry.total}
            </Badge>
          </button>

          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium',
                selectedCategory === category.key
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border/50 hover:border-border text-muted-foreground'
              )}
            >
              {categoryIcons[category.key]}
              {category.label}
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                {category.count}
              </Badge>
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredComponents.length}</span> of{' '}
            <span className="font-medium text-foreground">{registry.total}</span> components
          </p>
        </div>

        {/* Components Grid/List */}
        {filteredComponents.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No components found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredComponents.map((component) => (
              <Card
                key={component.name}
                className="group cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                onClick={() => setSelectedComponent(component)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      'p-2.5 rounded-lg border',
                      categoryColors[component.category]
                    )}>
                      {categoryIcons[component.category]}
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {component.category.replace('-', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base mb-2 group-hover:text-primary transition-colors">
                    {component.displayName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {component.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {component.variants.slice(0, 3).map((variant) => (
                        <Badge key={variant} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {variant}
                        </Badge>
                      ))}
                      {component.variants.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          +{component.variants.length - 3}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg divide-y overflow-hidden">
            {filteredComponents.map((component) => (
              <div
                key={component.name}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedComponent(component)}
              >
                <div className={cn(
                  'p-2 rounded-lg border shrink-0',
                  categoryColors[component.category]
                )}>
                  {categoryIcons[component.category]}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                    {component.displayName}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">{component.description}</p>
                </div>
                
                <Badge variant="outline" className="shrink-0 text-[10px] capitalize hidden sm:inline-flex">
                  {component.category.replace('-', ' ')}
                </Badge>
                
                <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">View</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Component Preview Modal */}
      <ComponentPreview
        component={selectedComponent}
        open={!!selectedComponent}
        onClose={() => setSelectedComponent(null)}
      />
    </div>
  );
}

export default ComponentsPageClient;
