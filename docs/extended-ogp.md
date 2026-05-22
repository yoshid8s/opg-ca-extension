# Extended OGP metadata (`og:op:*`)

This document describes the experimental extended OGP metadata
used by the OP/CAS Chrome extension and WordPress CA Manager Extension.

# Goal
To explore how OP/CAS authenticity metadata
can coexist with existing OGP-based social sharing ecosystems.

# Concept
Existing SNS platforms already understand OGP metadata.

This project explores whether OP/CAS-related authenticity metadata
can be layered onto existing OGP-compatible ecosystems
without breaking compatibility.

# Example
```
<meta property="og:op:cas" content="..." />
<meta property="og:op:issuer" content="..." />
<meta property="og:op:author" content="..." />
```

# Experimental Status
This is currently an experimental implementation
and not an official specification.

# Future Possibility
This implementation also explores the possibility of future
standardization approaches for authenticity-aware metadata
extensions compatible with existing OGP ecosystems.
