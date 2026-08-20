import re

content = ""
with open(r"c:\Users\navth\merging\microstay\app\terms\TermsOfServiceContent.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# I will replace the contents of the 5 tabs.

def create_html(text):
    html = ""
    for line in text.strip().split('\n'):
        line = line.strip()
        if not line:
            continue
        if line.isupper() and len(line) > 10:
            html += f'                    <h2 className="text-3xl font-bold mb-2">{line}</h2>\n'
        elif line.startswith(tuple(str(i)+'.' for i in range(1, 100))):
            html += f'                    <h3>{line}</h3>\n'
        elif line.startswith('•'):
            html += f'                      <li>{line[1:].strip()}</li>\n'
        else:
            html += f'                    <p>{line}</p>\n'
    # Wrap lis in uls
    html = re.sub(r'(<li>.*?</li>\n)+', lambda m: '                    <ul>\n' + m.group(0) + '                    </ul>\n', html)
    return html

import data

terms_html = f"""                  <div>
                    <h2 className="text-3xl font-bold mb-2">Terms of Service</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {{lastUpdated}}
                    </p>
{create_html(data.terms_content)}
                  </div>"""

cancel_html = f"""                  <div>
                    <h2 className="text-3xl font-bold mb-2">Cancellation Policy</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {{lastUpdated}}
                    </p>
{create_html(data.cancellation_content)}
                  </div>"""

access_html = f"""                  <div>
                    <h2 className="text-3xl font-bold mb-2">Accessibility Policy</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {{lastUpdated}}
                    </p>
{create_html(data.accessibility_content)}
                  </div>"""

safety_html = f"""                  <div>
                    <h2 className="text-3xl font-bold mb-2">Safety &amp; Security Policy</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {{lastUpdated}}
                    </p>
{create_html(data.safety_content)}
                  </div>"""

calif_html = f"""                  <div>
                    <h2 className="text-3xl font-bold mb-2">California Property Requirements</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
                      Last updated: {{lastUpdated}}
                    </p>
{create_html(data.california_content)}
                  </div>"""


content = re.sub(r'\{/\* 1\. GENERAL TERMS OF SERVICE \*/\}.*?(?=\{/\* 2\. CANCELLATION POLICY \*/\})', '{/* 1. GENERAL TERMS OF SERVICE */}\n                {activeTab === "terms" && (\n' + terms_html + '\n                )}\n\n                ', content, flags=re.DOTALL)
content = re.sub(r'\{/\* 2\. CANCELLATION POLICY \*/\}.*?(?=\{/\* 3\. ACCESSIBILITY POLICY \*/\})', '{/* 2. CANCELLATION POLICY */}\n                {activeTab === "cancellation" && (\n' + cancel_html + '\n                )}\n\n                ', content, flags=re.DOTALL)
content = re.sub(r'\{/\* 3\. ACCESSIBILITY POLICY \*/\}.*?(?=\{/\* 4\. SAFETY & SECURITY \*/\})', '{/* 3. ACCESSIBILITY POLICY */}\n                {activeTab === "accessibility" && (\n' + access_html + '\n                )}\n\n                ', content, flags=re.DOTALL)
content = re.sub(r'\{/\* 4\. SAFETY & SECURITY \*/\}.*?(?=\{/\* 5\. CALIFORNIA PROPERTY REQUIREMENTS \*/\})', '{/* 4. SAFETY & SECURITY */}\n                {activeTab === "safety" && (\n' + safety_html + '\n                )}\n\n                ', content, flags=re.DOTALL)
content = re.sub(r'\{/\* 5\. CALIFORNIA PROPERTY REQUIREMENTS \*/\}.*?(?=<div className="mt-12 pt-8 border-t)', '{/* 5. CALIFORNIA PROPERTY REQUIREMENTS */}\n                {activeTab === "california" && (\n' + calif_html + '\n                )}\n\n                ', content, flags=re.DOTALL)

with open(r"c:\Users\navth\merging\microstay\app\terms\TermsOfServiceContent.tsx", "w", encoding="utf-8") as f:
    f.write(content)
