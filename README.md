# Sip of Ghoulaid

A standalone, retro-TV storefront for handmade spooky goods. The public catalog is powered by browser `localStorage`, so product updates made through the local admin prototype are reflected in the storefront in the same browser.

## Local prototype admin

Open `admin.html` from the owner signal in the storefront. This page intentionally has **no real security** and must not be used in production: its client-side demo credentials are `owner` / `ghoulaid-demo`. It supports adding and editing products with price, stock, description, image URL, and visibility; it can publish/unpublish, delete with confirmation, and reset the local demo catalog.
