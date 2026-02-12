import test from "node:test";
import assert from "node:assert/strict";

const ENCRYPTION_TEST_ENV = {
  FIELD_ENCRYPTION_ENABLED: "true",
  APP_FIELD_ENCRYPTION_ACTIVE_KEY_VERSION: "v1",
  APP_FIELD_ENCRYPTION_KEYS:
    '{"v1":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="}',
  APP_FIELD_HASH_PEPPER:
    "test_pepper_for_encryption_suite_do_not_use_in_prod_12345",
};

const setEnv = () => {
  for (const [key, value] of Object.entries(ENCRYPTION_TEST_ENV)) {
    process.env[key] = value;
  }
};

const stubMethod = (target, methodName, impl, restoreStack) => {
  const original = target[methodName];
  target[methodName] = impl;
  restoreStack.push(() => {
    target[methodName] = original;
  });
};

test("importEmployees should create employees with encrypted/hash sensitive fields", async () => {
  setEnv();
  process.env.FIELD_ENCRYPTION_KEEP_LEGACY_DOC_PLAINTEXT = "true";

  const [serviceModule, modelsModule] = await Promise.all([
    import("./employeeImportService.js"),
    import("../models/index.js"),
  ]);

  const { importEmployees } = serviceModule;
  const {
    Employee,
    Counterparty,
    Status,
    Setting,
    CounterpartySubcounterpartyMapping,
    EmployeeCounterpartyMapping,
    EmployeeStatusMapping,
    sequelize,
  } = modelsModule;

  const restoreStack = [];
  let createPayload = null;

  try {
    stubMethod(
      Status,
      "findAll",
      async () => [
        { id: "st-1", name: "status_draft" },
        { id: "st-2", name: "status_card_draft" },
        { id: "st-3", name: "status_new" },
        { id: "st-4", name: "status_card_completed" },
      ],
      restoreStack,
    );

    const userCounterparty = {
      id: "cp-1",
      kpp: null,
      update: async () => {},
    };
    stubMethod(
      Counterparty,
      "findByPk",
      async () => userCounterparty,
      restoreStack,
    );
    stubMethod(
      CounterpartySubcounterpartyMapping,
      "findAll",
      async () => [],
      restoreStack,
    );
    stubMethod(Setting, "getSetting", async () => null, restoreStack);
    stubMethod(Employee, "findOne", async () => null, restoreStack);
    stubMethod(Employee, "findAll", async () => [], restoreStack);
    stubMethod(
      Employee,
      "create",
      async (payload) => {
        createPayload = payload;
        return {
          id: "emp-import-1",
          firstName: payload.firstName,
          lastName: payload.lastName,
          reload: async () => {},
        };
      },
      restoreStack,
    );
    stubMethod(
      EmployeeCounterpartyMapping,
      "findOne",
      async () => null,
      restoreStack,
    );
    stubMethod(
      EmployeeCounterpartyMapping,
      "create",
      async () => ({}),
      restoreStack,
    );
    stubMethod(EmployeeStatusMapping, "update", async () => [0], restoreStack);
    stubMethod(
      EmployeeStatusMapping,
      "findOne",
      async () => null,
      restoreStack,
    );
    stubMethod(EmployeeStatusMapping, "create", async () => ({}), restoreStack);

    const result = await importEmployees(
      [
        {
          rowIndex: 1,
          firstName: "Иван",
          lastName: "Петров",
          inn: "1234567890",
          kig: "AA1234567",
        },
      ],
      {},
      "user-1",
      "cp-1",
    );

    assert.equal(result.created, 1);
    assert.equal(result.updated, 0);
    assert.equal(result.errors.length, 0);

    assert.ok(createPayload);
    assert.equal(createPayload.firstName, "Иван");
    assert.equal(createPayload.lastName, "Петров");
    assert.equal(createPayload.kig, "AA1234567");
    assert.equal(createPayload.createdBy, "user-1");

    assert.ok(createPayload.lastNameEnc);
    assert.ok(createPayload.lastNameHash);
    assert.equal(createPayload.lastNameKeyVersion, "v1");

    assert.ok(createPayload.kigEnc);
    assert.ok(createPayload.kigHash);
    assert.equal(createPayload.kigKeyVersion, "v1");
  } finally {
    delete process.env.FIELD_ENCRYPTION_KEEP_LEGACY_DOC_PLAINTEXT;
    while (restoreStack.length > 0) {
      restoreStack.pop()();
    }
    await sequelize.close();
  }
});

test("importEmployees should update existing employees with encrypted/hash sensitive fields", async () => {
  setEnv();
  process.env.FIELD_ENCRYPTION_KEEP_LEGACY_DOC_PLAINTEXT = "true";

  const [serviceModule, modelsModule] = await Promise.all([
    import("./employeeImportService.js"),
    import("../models/index.js"),
  ]);

  const { importEmployees } = serviceModule;
  const {
    Employee,
    Counterparty,
    Status,
    Setting,
    CounterpartySubcounterpartyMapping,
    EmployeeCounterpartyMapping,
    EmployeeStatusMapping,
    sequelize,
  } = modelsModule;

  const restoreStack = [];
  let updatePayload = null;

  try {
    stubMethod(
      Status,
      "findAll",
      async () => [
        { id: "st-1", name: "status_draft" },
        { id: "st-2", name: "status_card_draft" },
        { id: "st-3", name: "status_new" },
        { id: "st-4", name: "status_card_completed" },
      ],
      restoreStack,
    );

    const userCounterparty = {
      id: "cp-1",
      kpp: null,
      update: async () => {},
    };
    stubMethod(
      Counterparty,
      "findByPk",
      async () => userCounterparty,
      restoreStack,
    );
    stubMethod(
      CounterpartySubcounterpartyMapping,
      "findAll",
      async () => [],
      restoreStack,
    );
    stubMethod(Setting, "getSetting", async () => null, restoreStack);

    const existingEmployee = {
      id: "emp-existing-1",
      firstName: "Иван",
      lastName: "Петров",
      middleName: null,
      inn: "1234567890",
      snils: null,
      kig: "AA1234567",
      birthDate: null,
      kigEndDate: null,
      positionId: null,
      citizenshipId: null,
      update: async (payload) => {
        updatePayload = payload;
      },
      reload: async () => {},
    };

    stubMethod(Employee, "findOne", async () => existingEmployee, restoreStack);
    stubMethod(Employee, "findAll", async () => [], restoreStack);
    stubMethod(
      Employee,
      "create",
      async () => {
        throw new Error(
          "Employee.create should not be called for update branch",
        );
      },
      restoreStack,
    );
    stubMethod(
      EmployeeCounterpartyMapping,
      "findOne",
      async () => ({ id: "mapping-1" }),
      restoreStack,
    );
    stubMethod(
      EmployeeCounterpartyMapping,
      "create",
      async () => {
        throw new Error(
          "Mapping create should not be called when mapping exists",
        );
      },
      restoreStack,
    );
    stubMethod(EmployeeStatusMapping, "update", async () => [0], restoreStack);
    stubMethod(
      EmployeeStatusMapping,
      "findOne",
      async () => null,
      restoreStack,
    );
    stubMethod(EmployeeStatusMapping, "create", async () => ({}), restoreStack);

    const result = await importEmployees(
      [
        {
          rowIndex: 1,
          firstName: "Иван",
          lastName: "Петров",
          inn: "1234567890",
          kig: "AB7654321",
        },
      ],
      {},
      "user-1",
      "cp-1",
    );

    assert.equal(result.created, 0);
    assert.equal(result.updated, 1);
    assert.equal(result.errors.length, 0);

    assert.ok(updatePayload);
    assert.equal(updatePayload.kig, "AB7654321");
    assert.equal(updatePayload.updatedBy, "user-1");
    assert.ok(updatePayload.kigEnc);
    assert.ok(updatePayload.kigHash);
    assert.equal(updatePayload.kigKeyVersion, "v1");
  } finally {
    delete process.env.FIELD_ENCRYPTION_KEEP_LEGACY_DOC_PLAINTEXT;
    while (restoreStack.length > 0) {
      restoreStack.pop()();
    }
    await sequelize.close();
  }
});

test("importEmployees should clear legacy doc plaintext when policy is disabled", async () => {
  setEnv();
  process.env.FIELD_ENCRYPTION_KEEP_LEGACY_DOC_PLAINTEXT = "false";

  const [serviceModule, modelsModule] = await Promise.all([
    import("./employeeImportService.js"),
    import("../models/index.js"),
  ]);

  const { importEmployees } = serviceModule;
  const {
    Employee,
    Counterparty,
    Status,
    Setting,
    CounterpartySubcounterpartyMapping,
    EmployeeCounterpartyMapping,
    EmployeeStatusMapping,
    sequelize,
  } = modelsModule;

  const restoreStack = [];
  let createPayload = null;

  try {
    stubMethod(
      Status,
      "findAll",
      async () => [
        { id: "st-1", name: "status_draft" },
        { id: "st-2", name: "status_card_draft" },
        { id: "st-3", name: "status_new" },
        { id: "st-4", name: "status_card_completed" },
      ],
      restoreStack,
    );

    const userCounterparty = {
      id: "cp-1",
      kpp: null,
      update: async () => {},
    };
    stubMethod(
      Counterparty,
      "findByPk",
      async () => userCounterparty,
      restoreStack,
    );
    stubMethod(
      CounterpartySubcounterpartyMapping,
      "findAll",
      async () => [],
      restoreStack,
    );
    stubMethod(Setting, "getSetting", async () => null, restoreStack);
    stubMethod(Employee, "findOne", async () => null, restoreStack);
    stubMethod(Employee, "findAll", async () => [], restoreStack);
    stubMethod(
      Employee,
      "create",
      async (payload) => {
        createPayload = payload;
        return {
          id: "emp-import-2",
          firstName: payload.firstName,
          lastName: payload.lastName,
          reload: async () => {},
        };
      },
      restoreStack,
    );
    stubMethod(
      EmployeeCounterpartyMapping,
      "findOne",
      async () => null,
      restoreStack,
    );
    stubMethod(
      EmployeeCounterpartyMapping,
      "create",
      async () => ({}),
      restoreStack,
    );
    stubMethod(EmployeeStatusMapping, "update", async () => [0], restoreStack);
    stubMethod(
      EmployeeStatusMapping,
      "findOne",
      async () => null,
      restoreStack,
    );
    stubMethod(EmployeeStatusMapping, "create", async () => ({}), restoreStack);

    const result = await importEmployees(
      [
        {
          rowIndex: 1,
          firstName: "Иван",
          lastName: "Петров",
          inn: "1234567890",
          kig: "AA1234567",
        },
      ],
      {},
      "user-1",
      "cp-1",
    );

    assert.equal(result.created, 1);
    assert.equal(result.errors.length, 0);
    assert.ok(createPayload);
    assert.equal(createPayload.kig, null);
    assert.ok(createPayload.kigEnc);
    assert.ok(createPayload.kigHash);
  } finally {
    delete process.env.FIELD_ENCRYPTION_KEEP_LEGACY_DOC_PLAINTEXT;
    while (restoreStack.length > 0) {
      restoreStack.pop()();
    }
    await sequelize.close();
  }
});
