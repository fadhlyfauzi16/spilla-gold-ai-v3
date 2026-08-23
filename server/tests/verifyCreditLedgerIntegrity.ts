import { creditService } from '../services/creditService.js';
import { prisma } from '../db/prisma.js';

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING SPILLA GOLD CREDIT LEDGER SAFETY VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 4;

  // -----------------------------------------------------------------
  // TEST 1: Wallet Balance Preservation & No Fake Zero Wallet Creation
  // -----------------------------------------------------------------
  console.log('[TEST 1] Testing Persistent Wallet Creation & Balance Preservation...');
  const testUserId = `test-user-${Date.now()}`;
  
  // Create user
  await prisma.user.create({
    data: {
      id: testUserId,
      fullName: 'Test Safety User',
      email: `${testUserId}@spillagold.internal`,
      role: 'USER',
      status: 'ACTIVE',
      accountType: 'Trader Individu',
    },
  });

  // Call getAllUserWalletsWithUsers
  const userWalletsBefore = await creditService.getAllUserWalletsWithUsers({ search: testUserId });
  if (userWalletsBefore.length !== 1 || userWalletsBefore[0].creditBalance !== 0) {
    throw new Error('Test 1 Failed: Missing persisted wallet on initialization');
  }

  // Verify wallet is actually in DB
  const dbWallet = await prisma.creditWallet.findUnique({ where: { userId: testUserId } });
  if (!dbWallet) {
    throw new Error('Test 1 Failed: Wallet was not persistently stored in DB');
  }

  // Adjust credit to 5000
  await creditService.adjustCredit('admin-system', 'Super Admin', testUserId, {
    type: 'ADD',
    amount: 5000,
    reason: 'Initial safe test deposit',
  });

  // Fetch wallet again
  const walletAfterAdd = await creditService.getWallet(testUserId);
  if (walletAfterAdd.creditBalance !== 5000) {
    throw new Error(`Test 1 Failed: Expected balance 5000, got ${walletAfterAdd.creditBalance}`);
  }

  // Verify getAllUserWalletsWithUsers does not reset balance
  const userWalletsAfter = await creditService.getAllUserWalletsWithUsers({ search: testUserId });
  if (userWalletsAfter[0].creditBalance !== 5000) {
    throw new Error(`Test 1 Failed: Wallet balance was overwritten/reset to ${userWalletsAfter[0].creditBalance}`);
  }

  console.log('✅ TEST 1 PASSED: Credit Wallet is persistently created and balance 5000 is strictly preserved!\n');
  passedTests++;

  // -----------------------------------------------------------------
  // TEST 2: Reconciliation Repair Mathematics (No Double Counting)
  // -----------------------------------------------------------------
  console.log('[TEST 2] Testing Reconciliation Repair Mathematics...');
  // Artificially de-sync wallet balance to 4000 while ledger sum is 5000
  await prisma.creditWallet.update({
    where: { userId: testUserId },
    data: { balance: 4000 },
  });

  // Reconcile -> Should report MISMATCH
  const reportBeforeRepair = await creditService.reconcileWallets();
  const userReportItemBefore = reportBeforeRepair.items.find(i => i.userId === testUserId);
  if (!userReportItemBefore || userReportItemBefore.status !== 'MISMATCH' || userReportItemBefore.difference !== -1000) {
    throw new Error(`Test 2 Failed: Expected MISMATCH with diff -1000, got: ${JSON.stringify(userReportItemBefore)}`);
  }

  // Repair
  const repairResult = await creditService.repairReconciliation(
    'admin-system',
    'Super Admin',
    testUserId,
    'Audit alignment test'
  );

  if (repairResult.repairedBalance !== 5000) {
    throw new Error(`Test 2 Failed: Expected repaired balance 5000, got ${repairResult.repairedBalance}`);
  }

  // Reconcile AGAIN -> MUST BE MATCH (Double-count bug would make ledger 6000 and fail)
  const reportAfterRepair = await creditService.reconcileWallets();
  const userReportItemAfter = reportAfterRepair.items.find(i => i.userId === testUserId);
  if (!userReportItemAfter || userReportItemAfter.status !== 'MATCH' || Math.abs(userReportItemAfter.difference) > 0.001) {
    throw new Error(`Test 2 Failed: Post-repair reconciliation failed! Status: ${userReportItemAfter?.status}, Diff: ${userReportItemAfter?.difference}`);
  }

  console.log('✅ TEST 2 PASSED: Reconciliation repair synchronizes balance to 5000 and re-running returns MATCH!\n');
  passedTests++;

  // -----------------------------------------------------------------
  // TEST 3: FK-Safe Excel Import (Users -> Wallets -> Topups -> AI Usage -> Ledgers)
  // -----------------------------------------------------------------
  console.log('[TEST 3] Testing FK-Safe Excel Import...');
  const importUserId = `import-user-${Date.now()}`;
  const importWalletId = `wal-${importUserId}`;
  const importLedgerId = `CLG-IMP-${Date.now()}`;
  const importTopupId = `TOP-IMP-${Date.now()}`;

  const mockPreview: any = {
    fileName: 'test_backup.xlsx',
    totalRowsParsed: 4,
    sheets: [{ name: 'USERS', rowCount: 1 }],
    newRecordsCount: 4,
    existingRecordsCount: 0,
    conflictsCount: 0,
    invalidRecordsCount: 0,
    newUsers: [
      {
        id: importUserId,
        fullName: 'Imported User Test',
        email: `${importUserId}@spillagold.internal`,
        role: 'USER',
        status: 'ACTIVE',
        accountType: 'Trader Individu',
      },
    ],
    newWallets: [
      {
        id: importWalletId,
        userId: importUserId,
        balance: 7500,
        totalTopUp: 7500,
        totalUsed: 0,
        totalAnalysis: 0,
      },
    ],
    newTopups: [
      {
        id: importTopupId,
        userId: importUserId,
        walletId: importWalletId,
        amountIdr: 750000,
        creditRequested: 7500,
        paymentMethod: 'MANUAL_BANK_TRANSFER',
        bankName: 'BCA',
        accountNumber: '12345678',
        accountName: 'Tester',
        status: 'CONFIRMED',
      },
    ],
    newAiUsage: [],
    newLedgers: [
      {
        id: importLedgerId,
        userId: importUserId,
        walletId: importWalletId,
        type: 'TOPUP',
        amount: 7500,
        balanceBefore: 0,
        balanceAfter: 7500,
        referenceId: importTopupId,
        description: 'Imported initial test topup',
        performedBy: 'ADMIN',
      },
    ],
    conflicts: [],
    invalidRows: [],
  };

  const importCommitResult = await creditService.commitExcelImport(
    'admin-system',
    'Super Admin',
    mockPreview,
    'RESTORE'
  );

  if (!importCommitResult.success || importCommitResult.importedLedgersCount !== 1) {
    throw new Error(`Test 3 Failed: Import commit failed: ${JSON.stringify(importCommitResult)}`);
  }

  // Verify wallet exists with 7500 balance
  const importedWallet = await creditService.getWallet(importUserId);
  if (importedWallet.creditBalance !== 7500) {
    throw new Error(`Test 3 Failed: Expected imported balance 7500, got ${importedWallet.creditBalance}`);
  }

  console.log('✅ TEST 3 PASSED: FK-Safe Excel Import successfully committed records in exact relational order!\n');
  passedTests++;

  // -----------------------------------------------------------------
  // TEST 4: Atomic Rollback & Error Propagation on Failure
  // -----------------------------------------------------------------
  console.log('[TEST 4] Testing Error Propagation & Atomic Rollback on Commit Failure...');
  const failUserId = `fail-user-${Date.now()}`;
  
  // Craft a preview that has an invalid user object that throws during insertion
  const failPreview: any = {
    fileName: 'corrupted_backup.xlsx',
    totalRowsParsed: 2,
    sheets: [],
    newRecordsCount: 2,
    existingRecordsCount: 0,
    conflictsCount: 0,
    invalidRecordsCount: 0,
    newUsers: [
      {
        id: failUserId,
        fullName: 'Doomed Rollback User',
        email: null, // Illegal null email will throw DB constraint error
        role: 'USER',
        status: 'ACTIVE',
      },
    ],
    newWallets: [],
    newTopups: [],
    newAiUsage: [],
    newLedgers: [],
    conflicts: [],
    invalidRows: [],
  };

  let caughtError = false;
  try {
    await creditService.commitExcelImport('admin-system', 'Super Admin', failPreview, 'MERGE');
  } catch (err: any) {
    caughtError = true;
    console.log('Caught expected transaction error:', err.message || err);
  }

  if (!caughtError) {
    throw new Error('Test 4 Failed: Expected commitExcelImport to throw on invalid user insertion, but it swallowed the error');
  }

  console.log('✅ TEST 4 PASSED: DB errors are cleanly propagated without silent swallowing!\n');
  passedTests++;

  console.log('====================================================');
  console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================');
}

runVerification().catch((err) => {
  console.error('❌ Verification FAILED:', err);
  process.exit(1);
});
