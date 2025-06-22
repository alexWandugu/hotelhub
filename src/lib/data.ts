export type Transaction = {
  id: string;
  clientName: string;
  partner: string;
  date: string;
  amount: number;
  status: "Completed" | "Flagged" | "Pending";
  recordedBy: string;
};

export const transactions: Transaction[] = [
  {
    id: "TRN74638",
    clientName: "Alice Johnson",
    partner: "Innovate Inc.",
    date: "2023-10-26",
    amount: 25.5,
    status: "Completed",
    recordedBy: "emp001",
  },
  {
    id: "TRN92547",
    clientName: "Bob Williams",
    partner: "Tech Solutions",
    date: "2023-10-26",
    amount: 19.75,
    status: "Completed",
    recordedBy: "emp002",
  },
  {
    id: "TRN10293",
    clientName: "Charlie Brown",
    partner: "Innovate Inc.",
    date: "2023-10-25",
    amount: 150.0,
    status: "Flagged",
    recordedBy: "emp001",
  },
  {
    id: "TRN58372",
    clientName: "Diana Miller",
    partner: "Global Exports",
    date: "2023-10-25",
    amount: 32.1,
    status: "Completed",
    recordedBy: "emp002",
  },
  {
    id: "TRN64839",
    clientName: "Ethan Davis",
    partner: "Tech Solutions",
    date: "2023-10-24",
    amount: 22.0,
    status: "Pending",
    recordedBy: "emp001",
  },
    {
    id: "TRN64840",
    clientName: "Fiona Clark",
    partner: "Innovate Inc.",
    date: "2023-10-24",
    amount: 28.9,
    status: "Completed",
    recordedBy: "emp002",
  },
  {
    id: "TRN64841",
    clientName: "George Hill",
    partner: "Global Exports",
    date: "2023-10-23",
    amount: 45.6,
    status: "Completed",
    recordedBy: "emp001",
  },
  {
    id: "TRN64842",
    clientName: "Hannah Wright",
    partner: "Tech Solutions",
    date: "2023-10-23",
    amount: 18.5,
    status: "Flagged",
    recordedBy: "emp002",
  },
];

export const transactionReportCSV = `transaction_id,client_name,partner,date,amount,status,recorded_by
TRN74638,Alice Johnson,Innovate Inc.,2023-10-26,25.50,Completed,emp001
TRN92547,Bob Williams,Tech Solutions,2023-10-26,19.75,Completed,emp002
TRN10293,Charlie Brown,Innovate Inc.,2023-10-25,150.00,Completed,emp001
TRN58372,Diana Miller,Global Exports,2023-10-25,32.10,Completed,emp002
TRN64839,Ethan Davis,Tech Solutions,2023-10-24,22.00,Completed,emp001
TRN64840,Fiona Clark,Innovate Inc.,2023-10-24,28.90,Completed,emp002
TRN64841,George Hill,Global Exports,2023-10-23,45.60,Completed,emp001
TRN64842,Hannah Wright,Tech Solutions,2023-10-23,18.50,Completed,emp002
TRN64843,Ian Scott,Innovate Inc.,2023-10-26,1890.75,Completed,emp001
`;

export type Partner = {
    id: string;
    name: string;
    status: 'Active' | 'Inactive';
    joinDate: string;
}
export const partners: Partner[] = [
    { id: 'P001', name: 'Innovate Inc.', status: 'Active', joinDate: '2022-01-15'},
    { id: 'P002', name: 'Tech Solutions', status: 'Active', joinDate: '2021-11-20'},
    { id: 'P003', name: 'Global Exports', status: 'Inactive', joinDate: '2022-03-10'},
]

export type Client = {
    id: string;
    name: string;
    partnerId: string;
    allowance: number;
    status: 'Active' | 'Suspended';
}

export const clients: Client[] = [
    { id: 'C001', name: 'Alice Johnson', partnerId: 'P001', allowance: 30, status: 'Active'},
    { id: 'C002', name: 'Bob Williams', partnerId: 'P002', allowance: 25, status: 'Active'},
    { id: 'C003', name: 'Charlie Brown', partnerId: 'P001', allowance: 35, status: 'Active'},
    { id: 'C004', name: 'Diana Miller', partnerId: 'P003', allowance: 40, status: 'Suspended'},
    { id: 'C005', name: 'Ethan Davis', partnerId: 'P002', allowance: 25, status: 'Active'},
]
