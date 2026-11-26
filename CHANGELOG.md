# Changelog

## v2.0.0

- Stabilized rc.4 with identical runtime logic, styles, locales and settings defaults.
- Documented reliable confirmation-field ID lookup, mismatch fallback, upgrade and rollback. Added mismatch regression coverage and corrected the test scope.

## v2.0.0-rc.4

- Normalize the optional confirmation in the structured request object used by the target build. Retain support for form-encoded requests.

## v2.0.0-rc.3

- With compatible validation metadata present, encode an untouched optional confirmation as false so the server plugin accepts the unanswered field. Required confirmations and standalone requests are unchanged.

## v2.0.0-rc.2

- Corrected excess whitespace and checkbox label alignment observed in the live desktop and mobile forms.
- Aligned the registration introduction with the mobile form.

## v2.0.0-rc.1

- Created an independent theme component with generic defaults and English and Simplified Chinese interface strings.
- Added settings for branding, section headings, descriptions, fixed titles, character counts, progressive messages and optional validation integration.
- Added an ordered rules list bound to an existing confirmation field ID, with independent introduction and checkbox text. Retained legacy description migration support.
- Kept native registration controls and validation in charge on standard installations. Enhanced plugin feedback activates only when compatible public metadata is detected and integration is enabled.
- Adjusted confirmation layout and removed redundant headings when the heading duplicates the visible required confirmation name.
- Added a compiled module audit, synthetic tests, release file allowlists and documentation.

Public release remains subject to live Discourse testing and maintainer approval.
