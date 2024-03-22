import React, { useMemo } from 'react';
import type { MenuProps } from 'antd';
import { Tag, version } from 'antd';
import { useFullSidebarData, useSidebarData } from 'dumi';

import Link from '../theme/common/Link';
import useLocation from './useLocation';

const MenuItemLabelWithTag: React.FC<{
  before?: React.ReactNode;
  after?: React.ReactNode;
  link: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  search?: string;
  tag?: string;
  className?: string;
}> = ({ before, after, link, title, subtitle, search, tag = '', className }) => {
  if (!before && !after) {
    return (
      <Link
        to={`${link}${search}`}
        style={
          tag
            ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
            : undefined
        }
        className={className}
      >
        <span>
          {title}
          {subtitle && <span className="chinese">{subtitle}</span>}
        </span>
        {tag && (
          <Tag
            bordered={false}
            color={tag === 'New' ? 'success' : 'processing'}
            style={{ marginBlockEnd: 0 }}
          >
            {tag.replace('VERSION', version)}
          </Tag>
        )}
      </Link>
    );
  }
  return (
    <Link to={`${link}${search}`} className={className}>
      {before}
      {title}
      {subtitle && <span className="chinese">{subtitle}</span>}
      {after}
    </Link>
  );
};

export interface UseMenuOptions {
  before?: React.ReactNode;
  after?: React.ReactNode;
}

const useMenu = (options: UseMenuOptions = {}): [MenuProps['items'], string] => {
  const fullData = useFullSidebarData();
  const { pathname, search } = useLocation();
  const sidebarData = useSidebarData();
  const { before, after } = options;

  const menuItems = useMemo<MenuProps['items']>(() => {
    const sidebarItems = [...(sidebarData ?? [])];

    // 将设计文档未分类的放在最后
    if (pathname.startsWith('/docs/spec')) {
      const notGrouped = sidebarItems.splice(0, 1);
      sidebarItems.push(...notGrouped);
    }

    // 把 /changelog 拼到开发文档中
    if (pathname.startsWith('/docs/react')) {
      const changelogData = Object.entries(fullData).find(([key]) =>
        key.startsWith('/changelog'),
      )?.[1];
      if (changelogData) {
        sidebarItems.splice(1, 0, changelogData[0]);
      }
    }
    if (pathname.startsWith('/changelog')) {
      const reactDocData = Object.entries(fullData).find(([key]) =>
        key.startsWith('/docs/react'),
      )?.[1];
      if (reactDocData) {
        sidebarItems.unshift(reactDocData[0]);
        sidebarItems.push(...reactDocData.slice(1));
      }
    }

    return (
      sidebarItems?.reduce<Exclude<MenuProps['items'], undefined>>((result, group) => {
        if (group?.title) {
          // 设计文档特殊处理二级分组
          if (pathname.startsWith('/docs/spec')) {
            const childrenGroup = group.children.reduce<
              Record<string, ReturnType<typeof useSidebarData>[number]['children']>
            >((childrenResult, child) => {
              const type = child.frontmatter?.type ?? 'default';
              if (!childrenResult[type]) {
                childrenResult[type] = [];
              }
              childrenResult[type].push(child);
              return childrenResult;
            }, {});
            const childItems = [];
            childItems.push(
              ...(childrenGroup.default?.map((item) => ({
                label: (
                  <Link to={`${item.link}${search}`}>
                    {before}
                    {item?.title}
                    {after}
                  </Link>
                ),
                key: item.link.replace(/(-cn$)/g, ''),
              })) ?? []),
            );
            Object.entries(childrenGroup).forEach(([type, children]) => {
              if (type !== 'default') {
                childItems.push({
                  type: 'group',
                  label: type,
                  key: type,
                  children: children?.map((item) => ({
                    label: (
                      <Link to={`${item.link}${search}`}>
                        {before}
                        {item?.title}
                        {after}
                      </Link>
                    ),
                    key: item.link.replace(/(-cn$)/g, ''),
                  })),
                });
              }
            });
            result.push({
              label: group?.title,
              key: group?.title,
              children: childItems,
            });
          } else {
            result.push({
              type: 'group',
              label: group?.title,
              key: group?.title,
              children: group.children?.map((item) => ({
                label: (
                  <MenuItemLabelWithTag
                    before={before}
                    after={after}
                    link={item.link}
                    title={item?.title}
                    subtitle={item.frontmatter?.subtitle}
                    search={search}
                    tag={item.frontmatter?.tag}
                  />
                ),
                key: item.link.replace(/(-cn$)/g, ''),
              })),
            });
          }
        } else {
          const list = group.children || [];
          // 如果有 date 字段，我们就对其进行排序
          if (list.every((info) => info?.frontmatter?.date)) {
            list.sort((a, b) => (a.frontmatter?.date > b.frontmatter?.date ? -1 : 1));
          }
          result.push(
            ...list.map((item) => ({
              label: (
                <MenuItemLabelWithTag
                  before={before}
                  after={after}
                  link={item.link}
                  title={item?.title}
                  search={search}
                  tag={item.frontmatter?.tag}
                />
              ),
              key: item.link.replace(/(-cn$)/g, ''),
            })),
          );
        }
        return result;
      }, []) ?? []
    );
  }, [sidebarData, fullData, pathname, search, options]);

  return [menuItems, pathname];
};

export default useMenu;
