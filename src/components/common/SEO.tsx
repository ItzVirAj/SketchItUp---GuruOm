import React, { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  schemaType?: 'Organization' | 'SoftwareApplication' | 'WebPage';
}

export const SEO: React.FC<SEOProps> = ({
  title = 'SketchItUp Owner OS — An AI-Enabled Business Operating System',
  description = 'SketchItUp Owner OS connects orders, inventory, production, finance and people into one real-time command center for total business control.',
  canonical,
  schemaType = 'SoftwareApplication'
}) => {
  useEffect(() => {
    document.title = title.includes('SketchItUp') ? title : `${title} | SketchItUp Solutions`;
    
    // Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }

    // Scroll to top on navigation
    window.scrollTo(0, 0);
  }, [title, description]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    'name': 'SketchItUp Owner OS',
    'applicationCategory': 'BusinessApplication',
    'operatingSystem': 'Web, Cloud, iOS, Android',
    'offers': {
      '@type': 'Offer',
      'price': 'Contact for pricing',
      'priceCurrency': 'USD'
    },
    'description': description,
    'publisher': {
      '@type': 'Organization',
      'name': 'SketchItUp Solutions',
      'url': 'https://sketchitup.com'
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
};
