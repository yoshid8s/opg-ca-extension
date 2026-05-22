🇯🇵For Japanese readers:
[Jump to Japanese version](#japanese)

## Extended OGP metadata (`og:op:*`)

This document describes the experimental extended OGP metadata
used by the OP/CAS Chrome extension and WordPress CA Manager Extension.

This approach is intended to coexist with existing OGP ecosystems,
not to replace them.

## Goal
To explore how OP/CAS authenticity metadata
can coexist with existing OGP-based social sharing ecosystems.

## What is an authenticity metadata ?
Authenticity metadata includes the following information, which in OP is represented by properties such as [PA](https://docs.originator-profile.org/ja/opb/pa/) and [CA](https://docs.originator-profile.org/ja/opb/ca/).

* publisher identity
* Web site identity
* author information etc.

## Concept
Since existing SNS platforms can already automatically interpret OGP metadata and display it in browsers, I believe that extending OGP metadata for Open Graph Protocol (OP), demonstrating OP use cases, and seeing more websites implement them will lead to greater recognition of the value and necessity of OP, and ultimately, the standard display of OP metadata in browsers and other viewing software.

This project explores whether OP/CAS-related authenticity metadata
can be layered onto existing OGP-compatible ecosystems
without breaking compatibility.

## Example
```
<meta property="og:op:cas" content="..." />
<meta property="og:op:issuer" content="..." />
<meta property="og:op:author" content="..." />
<meta property="og:op:published" content="..." />
```

## Compatibility

This approach is designed to coexist with
existing OGP-compatible platforms such as X (Twitter).

## “Why not standard OGP?”

Standard OGP does not currently provide a mechanism
for authenticity-related metadata such as OP/CAS information.

## Experimental Status
This is currently an experimental implementation
and not an official specification.

## Future Possibility
This implementation also explores the possibility of future
standardization approaches for authenticity-aware metadata
extensions compatible with existing OGP ecosystems.

<a id="japanese"></a>

# Japanese Version

## 拡張OGPメタデータ（`og:op:*`）

このドキュメントでは、OP/CAS Chrome拡張機能およびWordPress CA Manager拡張機能で使用される実験的な拡張OGPメタデータについて説明します。

このアプローチは、既存のOGPエコシステムと共存することを目的としており、それらに取って代わるものではありません。

## 目的
OP/CAS認証メタデータが既存のOGPベースのソーシャルシェアリングエコシステムとどのように共存できるかを検証する。

## 真正性メタデータとは？

真正性メタデータには、OPでは[PA](https://docs.originator-profile.org/ja/opb/pa/)や[CA](https://docs.originator-profile.org/ja/opb/ca/)といったプロパティで表される以下の情報が含まれます。

* 発行者情報
* ウェブサイト情報
* 著者情報など

## コンセプト
既存のSNSプラットフォームは既にOGPメタデータを自動解釈でき、ブラウザなどで表示できるようになっていることから、OGPメタデータをOP向けに拡張し、OPでのユースケースを示し、それを実践するWebサイトが増えれば増えるほど、OPの価値や必要性が認められ、ブラウザなどの閲覧ソフトウェアで標準的にOPメタデータも表示できるようになると考えています。

このプロジェクトでは、OP/CAS関連の認証メタデータを既存のOGP互換エコシステムに互換性を損なうことなく重ね合わせることができるかどうかを検証します。

## 例
```
<meta property="og:op:cas" content="..." />
<meta property="og:op:issuer" content="..." />
<meta property="og:op:author" content="..." />
<meta property="og:op:published" content="..." />
```

## 互換性

このアプローチは、
X（Twitter）などの既存のOGP互換プラットフォームと共存するように設計されています。 

## 「なぜ標準OGPではないのか？」

標準OGPは現在、OP/CAS情報などの真正性関連メタデータのためのメカニズムを提供していません。

## 実験段階
これは現在、実験的な実装であり、公式仕様ではありません。

## 今後の展望
この実装は、既存のOGPエコシステムと互換性のある、真正性を考慮したメタデータ拡張のための、将来的な標準化アプローチの可能性も探っています。
