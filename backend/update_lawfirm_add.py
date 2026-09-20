import os

file_path = r"e:\MarketBytes\legal-tech\frontend\src\pages\UI\LawfirmManagement\LawfirmAdd.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. formData state
old_state = """  const [formData, setFormData] = useState({
    id: null,
    advocateName: "",
    barCouncilId: "",
    enrollmentNumber: "",
    phoneNumber: "",
    emailAddress: "",
    joiningDate: "",
    gender: "",
    aadhaarNumber: "",
    practiceArea: "",
    yearsOfExperience: "",
    specialization: "",
    personalAddress: "",
    chambersAddress: "",
    about: "",
    profileImage: "",
    status: "Active",
    ...sanitizedInitialData,
  });"""

new_state = """  const [formData, setFormData] = useState({
    id: null,
    advocateName: "",
    barCouncilId: "",
    enrollmentNumber: "",
    phoneNumber: "",
    emailAddress: "",
    dateOfBirth: "",
    gender: "",
    aadhaarNumber: "",
    panNumber: "",
    practiceArea: "",
    courtType: "",
    yearsOfExperience: "",
    languagesKnown: "",
    lawFirmName: "",
    specialization: "",
    city: "",
    state: "",
    pincode: "",
    chambersAddress: "",
    about: "",
    profileImage: "",
    status: "Active",
    ...sanitizedInitialData,
  });"""
content = content.replace(old_state, new_state)

# 2. payload
old_payload = """      const payload = {
        advocateName: formData.advocateName,
        barCouncilId: formData.barCouncilId,
        enrollmentNumber: formData.enrollmentNumber,
        phoneNumber: formData.phoneNumber,
        emailAddress: formData.emailAddress,
        specialization: formData.specialization,
        status: formData.status || "Active",
        joiningDate: formData.joiningDate,
        gender: formData.gender,
        aadhaarNumber: formData.aadhaarNumber,
        practiceArea: formData.practiceArea,
        yearsOfExperience: formData.yearsOfExperience,
        personalAddress: formData.personalAddress,
        chambersAddress: formData.chambersAddress,
        about: formData.about,
        profileImage: formData.profileImage,
      };"""

new_payload = """      const payload = {
        advocateName: formData.advocateName,
        barCouncilId: formData.barCouncilId,
        enrollmentNumber: formData.enrollmentNumber,
        phoneNumber: formData.phoneNumber,
        emailAddress: formData.emailAddress,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        aadhaarNumber: formData.aadhaarNumber,
        panNumber: formData.panNumber,
        practiceArea: formData.practiceArea,
        courtType: formData.courtType,
        yearsOfExperience: formData.yearsOfExperience,
        languagesKnown: formData.languagesKnown,
        lawFirmName: formData.lawFirmName,
        specialization: formData.specialization,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        chambersAddress: formData.chambersAddress,
        about: formData.about,
        profileImage: formData.profileImage,
        status: formData.status || "Active",
      };"""
content = content.replace(old_payload, new_payload)

# 3. Personal Information
old_personal = """            <InputField label="Phone Number (Optional)" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} maxLength={10} />
            <InputField label="Email Address (Optional)" name="emailAddress" value={formData.emailAddress} onChange={handleChange} />
            <InputField label="Joining Date of Office" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} />

            <SelectField
              label="Gender"
              options={["Male", "Female", "Other"]}
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            />

            <InputField
              label="Aadhaar Number (Optional)" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} maxLength={12} />"""

new_personal = """            <InputField label="Phone Number (Optional)" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} maxLength={10} />
            <InputField label="Email Address (Optional)" type="email" name="emailAddress" value={formData.emailAddress} onChange={handleChange} />
            <InputField label="Date of Birth" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />

            <SelectField
              label="Gender"
              options={["Male", "Female", "Other"]}
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            />

            <InputField label="Aadhaar Number (Optional)" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} maxLength={12} />
            <InputField label="PAN Number (Optional)" name="panNumber" value={formData.panNumber} onChange={handleChange} />"""
content = content.replace(old_personal, new_personal)

# 4. Professional Information
old_prof = """          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <InputField label="Practice Area" name="practiceArea" value={formData.practiceArea} onChange={handleChange} />
            <InputField label="Years of Experience (Optional)" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} />
            <InputField label="Specialization (Optional)" name="specialization" value={formData.specialization} onChange={handleChange} />
            <SelectField
              label="Status"
              options={["Active", "Inactive"]}
              name="status"
              value={formData.status || "Active"}
              onChange={handleChange}
            />
          </div>"""

new_prof = """          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <SelectField label="Practice Area" options={["Civil Law", "Criminal Law", "Corporate Law", "Family Law", "Property Law"]} name="practiceArea" value={formData.practiceArea} onChange={handleChange} />
            <SelectField label="Court Type" options={["District Court", "High Court", "Supreme Court"]} name="courtType" value={formData.courtType} onChange={handleChange} />
            <InputField label="Years of Experience (Optional)" type="number" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} />
            <InputField label="Languages Known (Optional)" placeholder="English, Hindi" name="languagesKnown" value={formData.languagesKnown} onChange={handleChange} />
            <InputField label="Law Firm Name (Optional)" name="lawFirmName" value={formData.lawFirmName} onChange={handleChange} />
            <InputField label="Specialization (Optional)" name="specialization" value={formData.specialization} onChange={handleChange} />
            <SelectField
              label="Status"
              options={["Active", "Inactive"]}
              name="status"
              value={formData.status || "Active"}
              onChange={handleChange}
            />
          </div>"""
content = content.replace(old_prof, new_prof)

# 5. Address Information
old_addr = """          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <InputField label="Personal Address (Optional)" name="personalAddress" value={formData.personalAddress} onChange={handleChange} />
          </div>"""

new_addr = """          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <InputField label="City" name="city" value={formData.city} onChange={handleChange} />
            <InputField label="State" name="state" value={formData.state} onChange={handleChange} />
            <InputField label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} maxLength={6} />
          </div>"""
content = content.replace(old_addr, new_addr)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
