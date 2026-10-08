const fs = require('fs');
const path = 'd:/DEMO/demo uchun/frontend/src/hooks/usePayments.js';
let content = fs.readFileSync(path, 'utf8');

content += `

export const useCustomerPayments = (customerId) => {
  return useQuery({
    queryKey: ['customerPayments', customerId],
    queryFn: () => api.fetchCustomerPayments(customerId),
    enabled: !!customerId
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deletePayment,
    onSuccess: () => {
      toast.success("To'lov o'chirildi");
      queryClient.invalidateQueries({ queryKey: ['customerPayments'] });
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Xatolik yuz berdi")
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updatePayment,
    onSuccess: () => {
      toast.success("To'lov tahrirlandi");
      queryClient.invalidateQueries({ queryKey: ['customerPayments'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Xatolik yuz berdi")
  });
};
`;
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed usePayments.js');
