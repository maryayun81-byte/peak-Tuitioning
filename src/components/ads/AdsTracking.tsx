'use client'

import Script from 'next/script'
import { useEffect } from 'react'
import { FB_PIXEL_ID, GA_ID, trackPageView } from '@/lib/ads'

// Loads Meta Pixel + Google tag ONLY when env IDs exist.
// Scripts fire PageView solely after consent (see CookieConsent + lib/ads).
export function AdsTracking() {
  useEffect(() => {
    trackPageView()
  }, [])

  return (
    <>
      {FB_PIXEL_ID ? (
        <>
          <Script id="fb-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');fbq('init','${FB_PIXEL_ID}');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}
      {GA_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());
            gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
            gtag('config','${GA_ID}',{page_path:window.location.pathname});`}
          </Script>
        </>
      ) : null}
    </>
  )
}
