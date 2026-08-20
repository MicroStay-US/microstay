import os
import json

base_dir = r"c:\Users\navth\merging\microstay\app"

def create_page(path, title, date, content):
    full_path = os.path.join(base_dir, path, "page.tsx")
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    content_html = ""
    for line in content.strip().split('\n'):
        line = line.strip()
        if not line:
            continue
        if line.isupper() and len(line) > 10:
            content_html += f'        <h2>{line}</h2>\n'
        elif line.startswith(tuple(str(i)+'.' for i in range(1, 100))):
            content_html += f'        <h2>{line}</h2>\n'
        elif line.startswith('•'):
            content_html += f'        <ul><li>{line[1:].strip()}</li></ul>\n'
        else:
            content_html += f'        <p>{line}</p>\n'
    
    # fix ul/li grouping
    content_html = content_html.replace('</ul>\n        <ul>', '')

    jsx = f"""import {{ Metadata }} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {{
  title: '{title} | MicroStay',
  description: '{title} for MicroStay.',
}};

export default function {title.replace(' ', '').replace('&', '')}Page() {{
  const lastUpdated = '{date}';

  return (
    <div className="min-h-screen bg-orange-300/40 dark:bg-black text-foreground transition-colors duration-300">
      {{/* Header */}}
      <div className="bg-orange-300 dark:bg-gradient-to-tl dark:from-black dark:to-ms-orange dark:via-black py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-ms-orange dark:text-white">
          <h1 className="text-4xl font-bold mb-3">{title}</h1>
          {{lastUpdated && <p className="text-orange-900 dark:text-white/40">Last updated: {{lastUpdated}}</p>}}
        </div>
      </div>

      {{/* Content */}}
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-700 dark:text-gray-300 space-y-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-ms-text dark:[&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-ms-text dark:[&>h3]:text-gray-100 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&_a]:text-ms-orange hover:[&_a]:text-ms-orange-hover [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white">
{content_html}
        <div className="mt-12 pt-8 border-t flex justify-between border-gray-200 dark:border-gray-800 text-start">
          <Link href="/" className="text-ms-orange hover:text-ms-orange-hover transition-colors font-medium">
            &larr; Back to MicroStay
          </Link>
        </div>
      </div>
    </div>
  );
}}
"""
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(jsx)

# I will write the actual content in the next step.
