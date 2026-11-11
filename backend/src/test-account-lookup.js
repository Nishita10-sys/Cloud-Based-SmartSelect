    import 'dotenv/config'
import { findAccountByIdentifier } from './services/accountLookupService.js'

async function testLookup() {
  try {
    const result = await findAccountByIdentifier('SS-TEST-0001')

    console.log('\nAccount lookup result:')
    console.log('Found:', result.found)

    if (result.found) {
      console.log('Account type:', result.account.accountType)
      console.log('Profile ID:', result.account.profile.id)
      console.log('Role:', result.account.profile.role)
      console.log('Account status:', result.account.profile.account_status)
      console.log(
        'Force password change:',
        result.account.profile.force_password_change
      )
    }
  } catch (error) {
    console.error('Lookup test failed:', error.message)
  }
}

testLookup() 