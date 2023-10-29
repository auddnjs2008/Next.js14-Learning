'use server'
import {z} from 'zod'
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
const InvoiceSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
      .number()
      .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
  });

export type State = {
    errors?:{
        customerId?:string[];
        amount?:string[];
        status?:string[];
    };
    message?:string | null;
}


const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });

export async function createInvoice(prevState:State,formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      });

      if(!validatedFields.success){
        return{
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        }
      }
  
    const {customerId,amount,status} = validatedFields.data;

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    try{
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
    }catch(err){
        return{
            message :'Database ERror'
        }
    }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
  }


  const UpdateInvoice = InvoiceSchema.omit({ date: true });

  export async function updateInvoice(prevState:State,formData: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
      id: formData.get('id'),
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
    
    if(!validatedFields.success){
        return{
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        }
    }

    const {customerId,amount,status,id} = validatedFields.data;

    const amountInCents = amount * 100;
   
    try{
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
    }catch(error){
        return {
            message:'database Error'
        }
    }
   
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }

  const DeleteInvoice = InvoiceSchema.pick({ id: true });


  export async function deleteInvoice(formData: FormData) {
    throw new Error('Failed to Delete Invoice');

    const id = formData.get('id')?.toString();
    try{
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    return { message: 'Deleted Invoice.' };
    }catch(err){
        return {
            message:'database ERror'
        }
    }
    revalidatePath('/dashboard/invoices');
  }

  export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', Object.fromEntries(formData));
    } catch (error) {
      if ((error as Error).message.includes('CredentialsSignin')) {
        return 'CredentialSignin';
      }
      throw error;
    }
  }