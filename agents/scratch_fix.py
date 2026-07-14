import os

files_to_fix = [
    r"D:\ClearClaim\agents\claim_processor\router.py",
    r"D:\ClearClaim\agents\fraud_detector\router.py",
    r"D:\ClearClaim\agents\orchestrator\router.py",
    r"D:\ClearClaim\agents\policy_advisor\router.py"
]

for file in files_to_fix:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace occurrences safely
        content = content.replace('claims', 'claims')
        content = content.replace('insuranceplan', 'insuranceplan')
        content = content.replace('customer', 'customer')
        content = content.replace('policys', 'policys')
        content = content.replace('planhospital', 'planhospital')
        content = content.replace('patientinterventions', 'patientinterventions')
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file}")
    else:
        print(f"File not found: {file}")
