import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MarkdownファイルをHTML読み込み
const markdown = fs.readFileSync(path.join(__dirname, 'ADMIN_MANUAL.md'), 'utf-8');
const content = marked(markdown);

const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WannaV わなみさん使用ログ分析システム - 管理者マニュアル</title>
    <style>
        @media print {
            body { 
                font-size: 10pt;
                line-height: 1.4;
            }
            h1 { 
                page-break-before: always;
                font-size: 18pt;
                margin-top: 0;
            }
            h1:first-of-type {
                page-break-before: avoid;
            }
            h2 { 
                page-break-after: avoid;
                font-size: 14pt;
            }
            pre, code {
                page-break-inside: avoid;
                font-size: 8pt;
            }
            table {
                page-break-inside: avoid;
            }
            .no-print { display: none; }
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #2d3748;
            border-bottom: 3px solid #805ad5;
            padding-bottom: 10px;
            margin-top: 40px;
        }
        
        h1:first-of-type {
            margin-top: 0;
            color: #805ad5;
            font-size: 2.5em;
        }
        
        h2 {
            color: #4a5568;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
            margin-top: 30px;
        }
        
        h3 {
            color: #718096;
            margin-top: 25px;
        }
        
        code {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 2px 6px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #d53f8c;
        }
        
        pre {
            background: #2d3748;
            color: #e2e8f0;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            line-height: 1.5;
        }
        
        pre code {
            background: none;
            border: none;
            color: #e2e8f0;
            padding: 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid #e2e8f0;
            padding: 12px;
            text-align: left;
        }
        
        th {
            background: #edf2f7;
            font-weight: 600;
            color: #2d3748;
        }
        
        tr:nth-child(even) {
            background: #f7fafc;
        }
        
        blockquote {
            border-left: 4px solid #805ad5;
            margin: 20px 0;
            padding: 10px 20px;
            background: #faf5ff;
            color: #553c9a;
        }
        
        a {
            color: #805ad5;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 8px 0;
        }
        
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #805ad5;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 1000;
        }
        
        .print-button:hover {
            background: #6b46c1;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 8px;
        }
        
        .header h1 {
            color: white;
            border: none;
            margin: 0;
        }
        
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        
        .toc {
            background: #f7fafc;
            padding: 20px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            margin: 30px 0;
        }
        
        .toc h2 {
            margin-top: 0;
            border: none;
        }
        
        .toc ul {
            margin: 0;
            padding-left: 20px;
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">
        📄 PDF保存 (Ctrl+P)
    </button>
    
    <div class="container">
        <div class="header">
            <h1>WannaV わなみさん使用ログ分析システム</h1>
            <p>システム管理者マニュアル</p>
            <p>バージョン 1.0 | 最終更新: 2025-01-13</p>
        </div>
        
        ${content}
    </div>
    
    <script>
        // アンカーリンクのスムーズスクロール
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'ADMIN_MANUAL.html'), html);
console.log('✅ ADMIN_MANUAL.html を生成しました');
