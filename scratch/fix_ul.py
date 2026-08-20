import re

content = ""
with open(r"c:\Users\navth\merging\microstay\app\terms\TermsOfServiceContent.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix the ul li wrapping in TermsOfServiceContent
# Currently it looks like:
#                                           <ul>
# <li>daytime stays;</li>
#                     </ul>

# It should be grouped into a single ul.
# Let's just use regex to fix it in the file.
content = re.sub(r'                    </ul>\n                                          <ul>\n', '', content)
content = re.sub(r'                                          <ul>\n<li>', '                    <ul>\n                      <li>', content)
content = re.sub(r'</li>\n                    </ul>', '</li>\n                    </ul>', content)

with open(r"c:\Users\navth\merging\microstay\app\terms\TermsOfServiceContent.tsx", "w", encoding="utf-8") as f:
    f.write(content)
