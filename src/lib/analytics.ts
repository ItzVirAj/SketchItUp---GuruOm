import { AnalyticsEvent } from '../types';

/**
 * Analytics Abstraction Layer
 * Pluggable architecture ready for Google Analytics, Mixpanel, PostHog, or Segment.
 */
class AnalyticsService {
  private isDev = true;

  public trackEvent(eventName: string, properties?: Record<string, any>) {
    const payload: AnalyticsEvent = {
      eventName,
      properties,
      timestamp: new Date().toISOString(),
    };

    if (this.isDev) {
      console.log(`[Analytics Track]: ${eventName}`, payload);
    }

    // Future CRM / Analytics vendor hook:
    // if (window.gtag) { window.gtag('event', eventName, properties); }
    // if (window.posthog) { window.posthog.capture(eventName, properties); }
  }

  public trackPageView(path: string) {
    this.trackEvent('page_view', { path });
  }

  public trackFormSubmit(formName: string, data: Record<string, any>) {
    this.trackEvent('form_submit', { formName, ...data });
  }

  public trackModuleClick(slug: string, source: string) {
    this.trackEvent('module_click', { slug, source });
  }

  public trackCtaClick(label: string, destination: string) {
    this.trackEvent('cta_click', { label, destination });
  }
}

export const analytics = new AnalyticsService();
