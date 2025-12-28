# Quick Toshl Changelog

## [1.1.1] - {PR_MERGE_DATE}

### Added

- **Spending Planning**: New command to view monthly/yearly outlook, predictions, and actual performance (Pro feature).
- **Planning AI Tool**: AI can now answer questions about financial plans and outlook.
- **Currency Symbols**: Support for over 50 currency symbols ($, €, ₫, etc.) with automatic detection.
- **Auto-Currency Detection**: No longer requires manual currency selection; it now fetches your default from Toshl settings.

### Improved

- **Transaction Lists**: Entries are now beautifully grouped by date with summary headers showing Total, Expenses, Income, and Net.
- **Performance**: Switched to HTTP conditional caching (ETag/Last-Modified) for much faster loads and reduced API hits.
- **UI/UX**: Refined transaction and budget views with better spacing and symbol support.
- **Refactoring**: Simplified internal helper logic to rely on AI for date and amount standardization (removed manual regex parsing).
- **Dependencies**: Updated to React 19 and @raycast/utils 2.x for better performance and stability.
- **Documentation**: Updated README and metadata to reflect the new AI-native capabilities.

### Fixed

- UI consistency issues and incorrect rounding in some amount displays.

## [1.0.0] - 2025-12-27

- Initial Version: Basic support for adding expenses, income, transfers, and searching entries.
