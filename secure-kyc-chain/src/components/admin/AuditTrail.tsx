import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Search, ExternalLink } from 'lucide-react';
import { AuditRecord } from '@/types/kyc';
import { useState } from 'react';

interface AuditTrailProps {
  records: AuditRecord[];
}

export const AuditTrail = ({ records }: AuditTrailProps) => {
  const [search, setSearch] = useState('');

  const filteredRecords = records.filter(record =>
    record.entity_id.toLowerCase().includes(search.toLowerCase()) ||
    record.tx_hash.toLowerCase().includes(search.toLowerCase()) ||
    record.event_hash.toLowerCase().includes(search.toLowerCase())
  );

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'kyc_application':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'document':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'verification':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Blockchain Audit Trail</CardTitle>
            <CardDescription>
              Immutable record of all verification events
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID or hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Event Hash</TableHead>
                <TableHead>Transaction Hash</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-sm">
                    {new Date(record.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={getEntityTypeColor(record.entity_type)}>
                      {record.entity_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{record.entity_id}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {record.event_hash.slice(0, 20)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {record.tx_hash.slice(0, 20)}...
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <button 
                      className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                      onClick={() => {
                        // In a real implementation, this would link to a blockchain explorer
                        console.log('View on blockchain:', record.tx_hash);
                      }}
                    >
                      Verify on Chain
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No audit records found
          </div>
        )}
      </CardContent>
    </Card>
  );
};
