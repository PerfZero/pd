const BrowserAutofillTrap = () => (
  <div style={{ display: "none" }} aria-hidden="true">
    <input type="text" name="fakeusernameremember" autoComplete="username" />
    <input type="text" name="fakefirstname" autoComplete="given-name" />
    <input type="text" name="fakelastname" autoComplete="family-name" />
    <input type="text" name="fakeaddress" autoComplete="street-address" />
    <input type="text" name="fakecountry" autoComplete="country-name" />
    <input type="tel" name="fakephone" autoComplete="tel" />
    <input type="email" name="fakeemail" autoComplete="email" />
    <input
      type="password"
      name="fakepasswordremember"
      autoComplete="current-password"
    />
  </div>
);

export default BrowserAutofillTrap;
