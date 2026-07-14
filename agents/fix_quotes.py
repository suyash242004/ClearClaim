import os
import re

directories = [
    r"d:\ClearClaim\agents",
    r"d:\ClearClaim\database"
]

table_names = [
    customer, claims, policys, insuranceplan, planhospital, patientinterventions, hospital, familymember
]

def fix_quotes():
    for root, dirs, files in os.walk(directories[0]):
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content = content
                for table in table_names:
                    # Remove quotes and lowercase the table name
                    new_content = re.sub(rf'"{table}"', table.lower(), new_content)
                
                if new_content != content:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Fixed {filepath}")
                    
    for file in os.listdir(directories[1]):
        if file.endswith(".sql"):
            filepath = os.path.join(directories[1], file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            for table in table_names:
                new_content = re.sub(rf'"{table}"', table.lower(), new_content)
                
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Fixed {filepath}")

if __name__ == "__main__":
    fix_quotes()
