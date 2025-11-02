import { Table, Button, Input, Space, Typography, Avatar, Tag, Tooltip, Popconfirm, Checkbox } from 'antd';
import { ColumnsType } from 'antd/es/table';
import React, { FC, useState, useEffect } from 'react';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { Relay } from 'applesauce-relay';
import { RelayInformation } from 'nostr-tools/nip11';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

const { Text } = Typography;

export interface RelayRow {
  key: string;
  url: string;
  loading?: boolean;
  info?: RelayInformation | null;
  error?: string;
  selected?: boolean;
}

export type RelayTableProps = {
  relays: string[];
  selectedRelays?: string[];
  onChange: (relays: string[]) => void;
  onSelectionChange?: (selectedRelays: string[]) => void;
};

export const RelayTable: FC<RelayTableProps> = ({ 
  relays, 
  selectedRelays = [],
  onChange,
  onSelectionChange,
}) => {
  const [relayRows, setRelayRows] = useState<RelayRow[]>([]);
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [addingRelay, setAddingRelay] = useState(false);

  // Convert relay URLs to rows when props change
  useEffect(() => {
    const rows: RelayRow[] = relays.map((url, index) => ({
      key: `relay-${index}`,
      url,
      loading: false,
      info: null,
      error: undefined,
      selected: selectedRelays.includes(url),
    }));
    setRelayRows(rows);
    
    // Fetch NIP-11 info for all relays
    rows.forEach((row) => fetchRelayInfo(row));
  }, [relays, selectedRelays]);

  const fetchRelayInfo = async (row: RelayRow) => {
    setRelayRows((prev) =>
      prev.map((r) => (r.key === row.key ? { ...r, loading: true, error: undefined } : r)),
    );

    try {
      // Relay.fetchInformationDocument already includes timeout and error handling
      const info = await firstValueFrom(
        Relay.fetchInformationDocument(row.url).pipe(
          catchError((err) => {
            console.error(`Error fetching info for ${row.url}:`, err);
            return of(null);
          }),
        ),
      );

      setRelayRows((prev) =>
        prev.map((r) =>
          r.key === row.key
            ? {
                ...r,
                loading: false,
                info,
                error: info ? undefined : 'Failed to fetch relay information',
                selected: selectedRelays.includes(r.url),
              }
            : r,
        ),
      );
    } catch (error) {
      setRelayRows((prev) =>
        prev.map((r) =>
          r.key === row.key
            ? {
                ...r,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch relay information',
                selected: selectedRelays.includes(r.url),
              }
            : r,
        ),
      );
    }
  };

  const handleAddRelay = () => {
    if (!newRelayUrl.trim()) return;

    let url = newRelayUrl.trim();
    
    // Ensure URL starts with wss:// or ws://
    if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
      url = `wss://${url}`;
    }

    // Check if relay already exists
    if (relays.includes(url)) {
      setNewRelayUrl('');
      return;
    }

    const newRelays = [...relays, url];
    onChange(newRelays);
    setNewRelayUrl('');
    setAddingRelay(false);
  };

  const handleRemoveRelay = (url: string) => {
    onChange(relays.filter((r) => r !== url));
  };

  const handleRefresh = (row: RelayRow) => {
    fetchRelayInfo(row);
  };

  const handleSelectionChange = (url: string, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedRelays, url]);
    } else {
      onSelectionChange(selectedRelays.filter((r) => r !== url));
    }
  };

  const columns: ColumnsType<RelayRow> = [
    ...(onSelectionChange
      ? [
          {
            title: 'Use',
            key: 'selected',
            align: 'center',
            width: 80,
            render: (_, row: RelayRow) => (
              <Checkbox
                checked={row.selected}
                onChange={(e) => handleSelectionChange(row.url, e.target.checked)}
              />
            ),
          },
        ]
      : []),
    {
      title: 'Relay URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string, row: RelayRow) => (
        <Space>
          {row.info?.icon && (
            <Avatar src={row.info.icon} size="small" style={{ flexShrink: 0 }} />
          )}
          <Text code>{url}</Text>
        </Space>
      ),
    },
    {
      title: 'Name',
      dataIndex: ['info', 'name'],
      key: 'name',
      render: (name: string, row: RelayRow) => (
        <Text>{name || row.url.replace(/^wss?:\/\//, '')}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, row: RelayRow) => {
        if (row.loading) {
          return <Text type="secondary">Fetching...</Text>;
        }
        if (row.error) {
          return (
            <Tooltip title={row.error}>
              <Text type="danger">Error</Text>
            </Tooltip>
          );
        }
        if (row.info) {
          return <Text type="success">OK</Text>;
        }
        return <Text type="secondary">Unknown</Text>;
      },
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, row: RelayRow) => (
        <Space>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={() => handleRefresh(row)}
            loading={row.loading}
          />
          <Popconfirm
            title="Remove this relay?"
            onConfirm={() => handleRemoveRelay(row.url)}
            okText="Remove"
            cancelText="Cancel"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Table
        columns={columns}
        dataSource={relayRows}
        pagination={false}
        size="small"
        locale={{ emptyText: 'No custom relays added' }}
        footer={() => (
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="wss://relay.example.com"
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              onPressEnter={handleAddRelay}
              disabled={addingRelay}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddRelay}
              disabled={!newRelayUrl.trim() || addingRelay}
            >
              Add Relay
            </Button>
          </Space.Compact>
        )}
      />
      {relays.length === 0 && (
        <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '12px' }}>
          Add custom relays to use in addition to default relays (if enabled).
        </Text>
      )}
    </div>
  );
};

