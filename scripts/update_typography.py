import os
import re

directories = [
    r'c:\Users\B\zetimer\app\parent',
    r'c:\Users\B\zetimer\components'
]

# A regex that matches className="..."
class_regex = re.compile(r'className="([^"]+)"')
class_regex_curlies = re.compile(r'className=\{`([^`]+)`\}')

def update_classes(classes_str):
    # Split classes into a list
    classes = classes_str.split()
    
    # We want to remove all existing text sizing and font family/weight classes
    sizing_classes = {'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl'}
    weight_classes = {'font-thin', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'}
    line_height_classes = {'leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose'}
    tracking_classes = {'tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest'}
    
    has_size = None
    for c in classes:
        if c in sizing_classes:
            has_size = c
            break
            
    if not has_size and not any(c in weight_classes for c in classes):
        return classes_str # Do nothing if no text-classes are present
        
    # Heuristics to determine the new token
    new_token = None
    if 'text-3xl' in classes or 'text-4xl' in classes:
        new_token = 'typography-page-title'
    elif 'text-2xl' in classes:
        if any(w in classes for w in weight_classes if 'bold' in w or 'black' in w):
            new_token = 'typography-page-title'
        else:
            new_token = 'typography-section-title'
    elif 'text-xl' in classes:
        new_token = 'typography-section-title'
    elif 'CardTitle' in classes_str or 'AlertTitle' in classes_str or 'text-lg' in classes or ('text-base' in classes and any(w in classes for w in weight_classes if 'bold' in w or 'black' in w)):
        new_token = 'typography-card-title'
    elif 'text-xs' in classes:
        if any(w in classes for w in weight_classes if 'bold' in w or 'black' in w or 'semibold' in w):
            new_token = 'typography-label'
        else:
            new_token = 'typography-helper'
    elif 'text-sm' in classes:
        if any(w in classes for w in weight_classes if 'bold' in w or 'black' in w or 'semibold' in w or 'medium' in w):
            new_token = 'typography-label'
        else:
            new_token = 'typography-body'
    elif 'text-base' in classes:
        new_token = 'typography-body'
    elif any(c in weight_classes for c in classes):
        # Fallback based on weight
        if any(w in classes for w in weight_classes if 'bold' in w or 'black' in w or 'semibold' in w or 'medium' in w):
            new_token = 'typography-label'
        else:
            new_token = 'typography-body'
            
    if not new_token:
        return classes_str
        
    # Remove old typography classes
    filtered = [
        c for c in classes 
        if c not in sizing_classes 
        and c not in weight_classes 
        and c not in line_height_classes 
        # keep tracking classes as they might be intentional for badges? 
        # Let's remove them to standardise
        and c not in tracking_classes
        and not c.startswith('md:text-')
        and not c.startswith('lg:text-')
    ]
    
    # Add the new token at the beginning
    filtered.insert(0, new_token)
    
    return " ".join(filtered)

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    def replacer(match):
        old_classes = match.group(1)
        new_classes = update_classes(old_classes)
        return f'className="{new_classes}"'
        
    def replacer_curlies(match):
        old_classes = match.group(1)
        new_classes = update_classes(old_classes)
        return f'className={{`{new_classes}`}}'

    new_content = class_regex.sub(replacer, content)
    new_content = class_regex_curlies.sub(replacer_curlies, new_content)
    
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

for d in directories:
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                process_file(os.path.join(root, file))

print("Typography update complete.")
